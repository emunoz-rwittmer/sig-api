const { Op } = require('sequelize');
const MaintenanceService = require('./maintenance.services');
const MaintenanceRuleAssignment = require('../../models/catalogs/maintenanceRuleAssignment.models');
const Yacht = require('../../models/catalogs/yacht.models');
const { sendEmailMaintenanceAlerts } = require('../../mails/mailer');

const PENDING = ['vencida', 'proxima'];

// Decide el aviso del día sin tocar la base: hay correo si alguna alerta entró a un estado nuevo
// (al_dia -> proxima, proxima -> vencida) o si es lunes y queda algo pendiente.
const planMaintenanceNotice = (alerts, notifiedById, isMonday) => {
    const pending = alerts.filter((alert) => PENDING.includes(alert.status))
        .sort((a, b) => (a.status === b.status ? 0 : a.status === 'vencida' ? -1 : 1)
            || Number(b.equipmentCritical) - Number(a.equipmentCritical));
    const fresh = pending.filter((alert) => notifiedById.get(alert.assignmentId) !== alert.status);
    const pendingIds = new Set(pending.map((alert) => alert.assignmentId));
    const toClear = [...notifiedById.entries()]
        .filter(([id, status]) => status && !pendingIds.has(id)).map(([id]) => id);
    return {
        send: fresh.length > 0 || (isMonday && pending.length > 0),
        pending,
        newIds: new Set(fresh.map((alert) => alert.assignmentId)),
        fresh,
        toClear,
    };
};

const groupByYacht = (alerts, yachtNames) => {
    const groups = new Map();
    alerts.forEach((alert) => {
        if (!groups.has(alert.yachtId)) groups.set(alert.yachtId, { yachtName: yachtNames.get(alert.yachtId) || `Yate ${alert.yachtId}`, alerts: [] });
        groups.get(alert.yachtId).alerts.push(alert);
    });
    return [...groups.values()].sort((a, b) => a.yachtName.localeCompare(b.yachtName));
};

const notifyMaintenanceAlerts = async (now = new Date()) => {
    try {
        const alerts = await MaintenanceService.getRuleAlerts();
        const assignments = await MaintenanceRuleAssignment.findAll({ attributes: ['id', 'notifiedStatus'] });
        const notifiedById = new Map(assignments.map((assignment) => [assignment.id, assignment.notifiedStatus]));
        const isMonday = new Date(now.toLocaleString('en-US', { timeZone: 'America/Guayaquil' })).getDay() === 1;
        const plan = planMaintenanceNotice(alerts, notifiedById, isMonday);

        // Lo que ya se atendió vuelve a avisarse si se vence otra vez.
        if (plan.toClear.length) {
            await MaintenanceRuleAssignment.update({ notifiedStatus: null, notifiedAt: null }, { where: { id: { [Op.in]: plan.toClear } } });
        }
        if (!plan.send) {
            console.log('Mantenimiento: sin alertas nuevas para avisar');
            return plan;
        }

        const yachts = await Yacht.findAll({ attributes: ['id', 'name'], where: { id: { [Op.in]: [...new Set(plan.pending.map((a) => a.yachtId))] } } });
        await sendEmailMaintenanceAlerts(groupByYacht(plan.pending, new Map(yachts.map((y) => [y.id, y.name]))), plan.newIds);

        // Solo se marca después de enviar: si el correo falla, mañana se reintenta.
        for (const status of PENDING) {
            const ids = plan.fresh.filter((alert) => alert.status === status).map((alert) => alert.assignmentId);
            if (ids.length) await MaintenanceRuleAssignment.update({ notifiedStatus: status, notifiedAt: now }, { where: { id: { [Op.in]: ids } } });
        }
        console.log(`Mantenimiento: aviso enviado (${plan.pending.length} pendientes, ${plan.fresh.length} nuevas)`);
        return plan;
    } catch (error) {
        console.error('Error ejecutando cron job de alertas de mantenimiento:', error);
        return null;
    }
};

module.exports = { planMaintenanceNotice, notifyMaintenanceAlerts };

const { planMaintenanceNotice } = require('../../../src/services/catalogs/maintenanceAlertsNotifier');
const MailMaintenance = require('../../../src/mails/mailMaintenance');

const alert = (assignmentId, status, extra = {}) => ({ assignmentId, status, yachtId: 1, equipmentName: 'Generador', ruleName: 'Aceite', ...extra });

describe('planMaintenanceNotice', () => {
    it('avisa solo lo que entró a un estado nuevo y no repite lo ya avisado', () => {
        const alerts = [alert(1, 'vencida'), alert(2, 'proxima'), alert(3, 'al_dia')];
        const plan = planMaintenanceNotice(alerts, new Map([[1, 'proxima'], [2, 'proxima']]), false);

        expect(plan.send).toBe(true);
        expect([...plan.newIds]).toEqual([1]);
        expect(plan.pending.map((a) => a.assignmentId)).toEqual([1, 2]);
    });

    it('no envía si no hay nada nuevo, salvo el recordatorio del lunes', () => {
        const alerts = [alert(1, 'vencida')];
        const notified = new Map([[1, 'vencida']]);

        expect(planMaintenanceNotice(alerts, notified, false).send).toBe(false);
        expect(planMaintenanceNotice(alerts, notified, true).send).toBe(true);
        expect(planMaintenanceNotice([], new Map(), true).send).toBe(false);
    });

    it('limpia la marca de lo que ya se atendió para volver a avisar cuando se venza', () => {
        const plan = planMaintenanceNotice([alert(1, 'al_dia')], new Map([[1, 'vencida'], [2, null]]), false);

        expect(plan.toClear).toEqual([1]);
        expect(plan.send).toBe(false);
    });

    it('arma el correo con vencidas, horas faltantes y la marca de nueva', () => {
        const html = MailMaintenance.htmlMaintenanceAlerts([{ yachtName: 'KOLN', alerts: [
            alert(1, 'vencida', { remainingHours: -9, equipmentCritical: true }),
            alert(2, 'proxima', { remainingDays: 5 }),
        ] }], new Set([1]));

        expect(html).toContain('KOLN');
        expect(html).toContain('Pasada por 9 h');
        expect(html).toContain('Faltan 5 días');
        expect(html).toContain('NUEVA');
        expect(html).toContain('1 ya vencidos');
    });
});

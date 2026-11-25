require('dotenv').config();
const moment = require('moment');
const { mailLayout } = require('./mailLayout');

const STATUS = {
    vencida: { label: 'Vencida', color: '#b42318', bg: '#fdecea' },
    proxima: { label: 'Próxima', color: '#b54708', bg: '#fff4e5' },
};

const formatRemaining = (alert) => {
    if (alert.remainingHours != null) {
        const hours = Math.round(alert.remainingHours);
        const text = hours <= 0 ? `Pasada por ${Math.abs(hours)} h` : `Faltan ${hours} h`;
        return alert.estimatedDueAt && hours > 0 ? `${text} (aprox. ${moment(alert.estimatedDueAt).format('DD/MM/YYYY')})` : text;
    }
    if (alert.remainingDays != null) {
        return alert.remainingDays <= 0 ? `Pasada por ${Math.abs(alert.remainingDays)} días` : `Faltan ${alert.remainingDays} días`;
    }
    return '—';
};

const cell = 'padding:6px 8px;border-bottom:1px solid #eee;font-size:13px;vertical-align:top;';

const row = (alert, isNew) => {
    const status = STATUS[alert.status];
    return `
        <tr>
          <td style="${cell}">${alert.equipmentName}${alert.equipmentCritical ? ' <strong style="color:#b42318">(crítico)</strong>' : ''}</td>
          <td style="${cell}">${alert.ruleName}${isNew ? ' <span style="font-size:11px;color:#004aad;font-weight:600">NUEVA</span>' : ''}</td>
          <td style="${cell}"><span style="color:${status.color};background:${status.bg};padding:2px 8px;border-radius:10px;font-weight:600;white-space:nowrap">${status.label}</span></td>
          <td style="${cell}">${formatRemaining(alert)}</td>
          <td style="${cell}">${alert.lastPerformedAt ? moment(alert.lastPerformedAt).format('DD/MM/YYYY') : '—'}</td>
        </tr>`;
};

class MailMaintenance {
    // `groups`: [{ yachtName, alerts }] con las alertas vencidas y próximas; `newIds`: asignaciones que no se habían avisado.
    static htmlMaintenanceAlerts(groups, newIds) {
        const total = groups.reduce((sum, group) => sum + group.alerts.length, 0);
        const overdue = groups.reduce((sum, group) => sum + group.alerts.filter((a) => a.status === 'vencida').length, 0);
        const sections = groups.map(({ yachtName, alerts }) => `
            <h3 style="color:#0b2a45;margin:22px 0 6px">${yachtName}</h3>
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr style="background:#0b2a45;color:#fff;text-align:left">
                  <th style="${cell}">Equipo</th><th style="${cell}">Mantenimiento</th><th style="${cell}">Estado</th>
                  <th style="${cell}">Vencimiento</th><th style="${cell}">Último servicio</th>
                </tr>
              </thead>
              <tbody>${alerts.map((alert) => row(alert, newIds.has(alert.assignmentId))).join('')}</tbody>
            </table>`).join('');

        const bodyHtml = `
            <p>Hola,</p>
            <p>Hay <strong>${total}</strong> mantenimientos que necesitan atención${overdue ? `, <strong style="color:#b42318">${overdue} ya vencidos</strong>` : ''}.
            Al realizarlos, regístrenlos en el sistema para que la alerta se cierre.</p>
            ${sections}
            <p style="font-size:12px;color:#666;margin-top:18px">El vencimiento por horas usa la última lectura de horómetro registrada.
            Si un equipo no tiene lecturas recientes, el estado puede estar desactualizado.</p>`;

        return mailLayout({
            title: 'Mantenimientos por atender',
            bodyHtml,
            button: { text: 'Ver libro de mantenimiento', href: `${process.env.URL}/maintenance/book` },
        });
    }
}

module.exports = MailMaintenance;

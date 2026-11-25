const request = require('supertest');
const dayjs = require('dayjs');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const YachtEquipment = require('../../../src/models/catalogs/yachtEquipment.models');
const MaintenanceRule = require('../../../src/models/catalogs/maintenanceRule.models');
const MaintenanceRuleAssignment = require('../../../src/models/catalogs/maintenanceRuleAssignment.models');
const MaintenanceRecord = require('../../../src/models/catalogs/maintenanceRecord.models');
const MaintenanceTask = require('../../../src/models/catalogs/maintenanceTask.models');
const MaintenanceService = require('../../../src/services/catalogs/maintenance.services');
const Utils = require('../../../src/utils/Utils');

let app;
let token;

const auth = (httpRequest) => httpRequest.set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('catalogs/maintenance - tareas por realizar', () => {
    it('genera la tarea al vencerse la regla, el registro la completa a nombre del sistema y el mismo usuario lo aprueba', async () => {
        const { yacht } = await createCompanyWithYacht('Task Co', 'Task Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Generador Babor' });
        const rule = await MaintenanceRule.create({ name: 'Aceite tareas', periodicityValue: 30, periodicityUnit: 'dias' });
        await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: rule.id });
        await MaintenanceRecord.create({
            equipmentId: equipment.id, yachtId: yacht.id, ruleId: rule.id, responsible: 'Juan',
            workPerformed: 'Aceite anterior', performedAt: dayjs().subtract(40, 'day').toDate(),
        });

        const alerts = await MaintenanceService.getRuleAlerts(yacht.id);
        expect(alerts[0].status).toBe('vencida');
        expect((await MaintenanceService.syncTasks(alerts)).created).toHaveLength(1);
        // Correr de nuevo no duplica la tarea pendiente.
        expect((await MaintenanceService.syncTasks(alerts)).created).toHaveLength(0);

        const list = await auth(request(app).get('/api/maintenance/tasks')).query({ yachtId: Utils.encode(yacht.id), status: 'pendiente' });
        expect(list.status).toBe(200);
        expect(list.body).toEqual([expect.objectContaining({
            ruleName: 'Aceite tareas', equipmentName: 'Generador Babor', dueStatus: 'vencida', status: 'pendiente',
            equipmentId: Utils.encode(equipment.id), ruleId: Utils.encode(rule.id),
        })]);

        const created = await auth(request(app).post('/api/maintenance/records')).send({
            equipmentId: Utils.encode(equipment.id), ruleId: Utils.encode(rule.id), responsible: 'Jefe de máquinas',
            workPerformed: 'Aceite tareas', performedAt: dayjs().subtract(1, 'hour').toISOString(),
        });
        expect(created.status).toBe(200);

        const record = await MaintenanceRecord.findOne({ where: { responsible: 'Jefe de máquinas' } });
        expect(record).toMatchObject({ createdBy: 'Sistema', createdById: null, createdByKind: 'system' });
        const task = await MaintenanceTask.findOne({ where: { equipmentId: equipment.id } });
        expect(task).toMatchObject({ status: 'completada', recordId: record.id });

        const approved = await auth(request(app).put(`/api/maintenance/records/${Utils.encode(record.id)}/approve`)).send({});
        expect(approved.status).toBe(200);
    });

    it('cierra la tarea si la regla deja de estar pendiente sin registro, y los registros sin tarea siguen a nombre del usuario', async () => {
        const { yacht } = await createCompanyWithYacht('Task Close Co', 'Task Close Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Motor Estribor' });
        const rule = await MaintenanceRule.create({ name: 'Filtro tareas', periodicityValue: 30, periodicityUnit: 'dias' });
        const assignment = await MaintenanceRuleAssignment.create({ equipmentId: equipment.id, ruleId: rule.id });
        await MaintenanceRecord.create({
            equipmentId: equipment.id, yachtId: yacht.id, ruleId: rule.id, responsible: 'Juan',
            workPerformed: 'Filtro anterior', performedAt: dayjs().subtract(29, 'day').toDate(),
        });

        await MaintenanceService.syncTasks(await MaintenanceService.getRuleAlerts(yacht.id));
        expect(await MaintenanceTask.count({ where: { assignmentId: assignment.id, status: 'pendiente' } })).toBe(1);

        // Se desactiva la regla en el equipo: deja de haber alerta y la tarea se cierra sola.
        await assignment.update({ active: false });
        const result = await MaintenanceService.syncTasks(await MaintenanceService.getRuleAlerts());
        expect(result.closed).toHaveLength(1);
        expect((await MaintenanceTask.findOne({ where: { assignmentId: assignment.id } })).status).toBe('cerrada');

        await auth(request(app).post('/api/maintenance/records')).send({
            equipmentId: Utils.encode(equipment.id), ruleId: Utils.encode(rule.id), responsible: 'Sin tarea',
            workPerformed: 'Filtro tareas', performedAt: dayjs().subtract(1, 'hour').toISOString(),
        });
        expect((await MaintenanceRecord.findOne({ where: { responsible: 'Sin tarea' } })).createdBy).toBe('Test Admin');
    });
});

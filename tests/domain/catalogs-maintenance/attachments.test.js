const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const YachtEquipment = require('../../../src/models/catalogs/yachtEquipment.models');
const MaintenanceRecord = require('../../../src/models/catalogs/maintenanceRecord.models');
const MaintenanceRecordAttachment = require('../../../src/models/catalogs/maintenanceRecordAttachment.models');
const { MAINTENANCE_UPLOAD_DIR } = require('../../../src/utils/uploadConfiguration');
const Utils = require('../../../src/utils/Utils');

let app;
let token;

const auth = (httpRequest) => httpRequest.set('Authorization', `Bearer ${token}`);
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6360000002000154a24f5d0000000049454e44ae426082', 'hex');

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    // No dejar en disco lo que subieron los tests.
    const stored = await MaintenanceRecordAttachment.findAll();
    stored.forEach((attachment) => fs.rmSync(path.join(MAINTENANCE_UPLOAD_DIR, path.basename(attachment.url)), { force: true }));
    await shutdownTestApp();
});

describe('catalogs/maintenance - attachments', () => {
    it('attaches images or PDFs signed by the user, rejects other files, and only removes them while pending', async () => {
        const { yacht } = await createCompanyWithYacht('Attach Co', 'Attach Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Generador' });
        const record = await MaintenanceRecord.create({
            equipmentId: equipment.id, yachtId: yacht.id, responsible: 'Juan',
            workPerformed: 'Cambio de filtro', performedAt: new Date('2026-10-01T10:00:00.000Z'),
        });
        const url = `/api/maintenance/records/${Utils.encode(record.id)}/attachments`;

        const rejected = await auth(request(app).post(url)).attach('files', Buffer.from('hola'), { filename: 'nota.txt', contentType: 'text/plain' });
        expect(rejected.status).toBe(400);
        expect((await auth(request(app).post(url))).status).toBe(400);

        const uploaded = await auth(request(app).post(url))
            .attach('files', PNG, { filename: 'foto del filtro.png', contentType: 'image/png' })
            .attach('files', Buffer.from('%PDF-1.4\n%%EOF'), { filename: 'factura.pdf', contentType: 'application/pdf' });
        expect(uploaded.status).toBe(200);

        const detail = await auth(request(app).get(`/api/maintenance/records/${Utils.encode(record.id)}`));
        expect(detail.body.attachments).toHaveLength(2);
        const photo = detail.body.attachments.find((item) => item.fileName === 'foto del filtro.png');
        expect(photo).toMatchObject({ mimeType: 'image/png', uploadedBy: 'Test Admin' });
        expect(photo.url).toMatch(/^\/uploads\/maintenance\/foto-del-filtro-\d+-\d+\.png$/);
        expect(fs.existsSync(path.join(MAINTENANCE_UPLOAD_DIR, path.basename(photo.url)))).toBe(true);

        const removed = await auth(request(app).delete(`/api/maintenance/records/attachments/${photo.id}`));
        expect(removed.status).toBe(200);
        expect(fs.existsSync(path.join(MAINTENANCE_UPLOAD_DIR, path.basename(photo.url)))).toBe(false);

        await record.update({ approvedAt: new Date(), approvedBy: 'Jefe' });
        const invoice = detail.body.attachments.find((item) => item.fileName === 'factura.pdf');
        expect((await auth(request(app).delete(`/api/maintenance/records/attachments/${invoice.id}`))).status).toBe(409);
    });
});

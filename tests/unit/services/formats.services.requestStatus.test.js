jest.mock('../../../src/models/rrhh/doctorFormat.models', () => ({}));
jest.mock('../../../src/models/rrhh/format.models', () => ({ findAll: jest.fn() }));
jest.mock('../../../src/models/rrhh/requestStaffs.models', () => ({
    findAll: jest.fn(),
    findOne: jest.fn(),
}));

const RequestStaffs = require('../../../src/models/rrhh/requestStaffs.models');
const Format = require('../../../src/models/rrhh/format.models');
const FormatService = require('../../../src/services/rrhh/formats.services');

describe('FormatService request status', () => {
    beforeEach(() => jest.clearAllMocks());

    it('arma el código SOL-xxxx con cuatro dígitos', () => {
        expect(FormatService.formatRequestCode(7)).toBe('SOL-0007');
        expect(FormatService.formatRequestCode(1234)).toBe('SOL-1234');
        expect(FormatService.formatRequestCode(12345)).toBe('SOL-12345');
    });

    it('lista las solicitudes del colaborador en orden cronológico', async () => {
        RequestStaffs.findAll.mockResolvedValue([]);

        await FormatService.getAllRequestsByStaff(9);

        expect(RequestStaffs.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ where: { staffId: 9 }, order: [['createdAt', 'ASC']] })
        );
    });

    describe('getAllRequestsByStaffWithFormat', () => {
        const request = (id, formatId, name) => ({ id, formatId, name, dataValues: { id, formatId } });

        it('adjunta el nombre del formato y ordena de la más reciente a la más antigua', async () => {
            RequestStaffs.findAll.mockResolvedValue([request(5, 1, 'archivo-a'), request(4, 2, 'archivo-b'), request(3, 1, 'archivo-c')]);
            Format.findAll.mockResolvedValue([{ id: 1, name: 'Anticipo de sueldo' }, { id: 2, name: 'Certificado laboral' }]);

            const result = await FormatService.getAllRequestsByStaffWithFormat(9);

            expect(RequestStaffs.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ where: { staffId: 9 }, order: [['createdAt', 'DESC']] })
            );
            expect(Format.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { id: [1, 2] } }));
            expect(result.map((entry) => entry.dataValues.formatName)).toEqual([
                'Anticipo de sueldo', 'Certificado laboral', 'Anticipo de sueldo',
            ]);
        });

        it('usa el nombre de la solicitud si el formato ya no existe', async () => {
            RequestStaffs.findAll.mockResolvedValue([request(5, 7, 'Formato borrado')]);
            Format.findAll.mockResolvedValue([]);

            const [entry] = await FormatService.getAllRequestsByStaffWithFormat(9);

            expect(entry.dataValues.formatName).toBe('Formato borrado');
        });

        it('no consulta formatos cuando el colaborador no tiene solicitudes', async () => {
            RequestStaffs.findAll.mockResolvedValue([]);

            await expect(FormatService.getAllRequestsByStaffWithFormat(9)).resolves.toEqual([]);
            expect(Format.findAll).not.toHaveBeenCalled();
        });
    });

    describe('respondRequest', () => {
        it.each(['aprobada', 'rechazada'])('guarda el estado %s y la fecha de respuesta', async (status) => {
            const request = { update: jest.fn() };
            RequestStaffs.findOne.mockResolvedValue(request);

            await FormatService.respondRequest(3, status);

            expect(request.update).toHaveBeenCalledWith({ status, respondedAt: expect.any(Date) });
        });

        it.each(['revision', 'borrada', undefined])('rechaza con 400 el estado %s', async (status) => {
            await expect(FormatService.respondRequest(3, status)).rejects.toMatchObject({ statusCode: 400 });
            expect(RequestStaffs.findOne).not.toHaveBeenCalled();
        });

        it('responde 404 si la solicitud no existe', async () => {
            RequestStaffs.findOne.mockResolvedValue(null);

            await expect(FormatService.respondRequest(99, 'aprobada')).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});

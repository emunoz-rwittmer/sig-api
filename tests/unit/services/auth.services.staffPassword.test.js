jest.mock('../../../src/models/catalogs/user.models', () => ({}));
jest.mock('../../../src/models/catalogs/roles.models', () => ({}));
jest.mock('../../../src/models/catalogs/positions.models', () => ({}));
jest.mock('../../../src/models/catalogs/staffCompany.models', () => ({}));
jest.mock('../../../src/models/catalogs/company.models', () => ({}));
jest.mock('../../../src/models/catalogs/staff.models', () => ({
    findByPk: jest.fn(),
    update: jest.fn(),
}));

const bcrypt = require('bcrypt');
const Staff = require('../../../src/models/catalogs/staff.models');
const AuthService = require('../../../src/services/catalogs/auth.services');

describe('AuthService.changeStaffPassword', () => {
    const currentHash = bcrypt.hashSync('Actual1', 4);

    beforeEach(() => {
        jest.clearAllMocks();
        Staff.findByPk.mockResolvedValue({ id: 7, active: true, password: currentHash });
        Staff.update.mockResolvedValue([1]);
    });

    it('actualiza el hash cuando la contraseña actual es correcta', async () => {
        await AuthService.changeStaffPassword({ staffId: 7, currentPassword: 'Actual1', newPassword: 'Nueva123' });

        const [values, options] = Staff.update.mock.calls[0];
        expect(bcrypt.compareSync('Nueva123', values.password)).toBe(true);
        expect(values.changePassword).toBe(false);
        expect(options).toEqual({ where: { id: 7 } });
    });

    it('rechaza con 400 si la contraseña actual es incorrecta', async () => {
        await expect(
            AuthService.changeStaffPassword({ staffId: 7, currentPassword: 'Mala1234', newPassword: 'Nueva123' })
        ).rejects.toMatchObject({ statusCode: 400 });
        expect(Staff.update).not.toHaveBeenCalled();
    });

    it.each(['Ab1de', 'sinnumeroA', 'SINMINUS1', 'sinmayus1', 'Demasiado1234567'])(
        'rechaza con 400 la nueva contraseña "%s" por política',
        async (newPassword) => {
            await expect(
                AuthService.changeStaffPassword({ staffId: 7, currentPassword: 'Actual1', newPassword })
            ).rejects.toMatchObject({ statusCode: 400 });
            expect(Staff.update).not.toHaveBeenCalled();
        }
    );

    it('rechaza con 400 si faltan campos', async () => {
        await expect(
            AuthService.changeStaffPassword({ staffId: 7, newPassword: 'Nueva123' })
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rechaza con 404 si el colaborador no existe o está deshabilitado', async () => {
        Staff.findByPk.mockResolvedValueOnce(null);
        await expect(
            AuthService.changeStaffPassword({ staffId: 9, currentPassword: 'Actual1', newPassword: 'Nueva123' })
        ).rejects.toMatchObject({ statusCode: 404 });

        Staff.findByPk.mockResolvedValueOnce({ id: 7, active: false, password: currentHash });
        await expect(
            AuthService.changeStaffPassword({ staffId: 7, currentPassword: 'Actual1', newPassword: 'Nueva123' })
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});

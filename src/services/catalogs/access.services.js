const { Op } = require('sequelize');
const db = require('../../utils/database');
const AccessProfile = require('../../models/catalogs/accessProfile.models');
const Users = require('../../models/catalogs/user.models');
const Staff = require('../../models/catalogs/staff.models');
const Roles = require('../../models/catalogs/roles.models');
const Warehouse = require('../../models/catalogs/wareHouse.models');
const AppError = require('../../errors/AppError');
const { sanitizePermissions } = require('../../utils/accessCatalog');

const PEOPLE = { user: Users, staff: Staff };

class AccessService {

    /**
     * Acceso efectivo de quien hace la petición. El administrador del panel entra a
     * todo. Quien no tiene perfil asignado queda con `profile: null` y el front
     * sigue mostrándole lo que su rol veía antes (transición sin cortes).
     */
    static async getAccessFor({ kind, id, rol }) {
        const isSuper = rol === 'admin' && kind !== 'staff';
        const Model = PEOPLE[kind];
        const person = Model && id ? await Model.findByPk(id, { attributes: ['id', 'accessProfileId'] }) : null;
        const profile = person?.accessProfileId ? await AccessProfile.findByPk(person.accessProfileId) : null;

        return {
            isSuper,
            profile: profile ? { id: profile.id, name: profile.name } : null,
            permissions: profile ? sanitizePermissions(profile.permissions) : {},
            warehouseIds: profile?.warehouseIds ?? null,
        };
    }

    static async listProfiles() {
        const [profiles, users, staffs] = await Promise.all([
            AccessProfile.findAll({ order: [['name', 'ASC']] }),
            AccessService.countByProfile(Users),
            AccessService.countByProfile(Staff),
        ]);
        return profiles.map((profile) => ({
            ...profile.get({ plain: true }),
            people: (users.get(profile.id) ?? 0) + (staffs.get(profile.id) ?? 0),
        }));
    }

    static async countByProfile(Model) {
        const rows = await Model.findAll({
            attributes: ['accessProfileId', [db.fn('COUNT', db.col('id')), 'total']],
            where: { accessProfileId: { [Op.ne]: null } },
            group: ['accessProfileId'],
            raw: true,
        });
        return new Map(rows.map((row) => [row.accessProfileId, Number(row.total)]));
    }

    static async buildProfileData({ name, description, permissions, warehouseIds }, currentId) {
        const cleanName = String(name ?? '').trim();
        if (!cleanName) {
            throw new AppError('El nombre del perfil es requerido', 400);
        }
        const duplicate = await AccessProfile.findOne({
            where: { name: cleanName, ...(currentId && { id: { [Op.ne]: currentId } }) },
        });
        if (duplicate) {
            throw new AppError('Ya existe un perfil con ese nombre', 400);
        }

        let warehouses = null;
        if (Array.isArray(warehouseIds)) {
            const found = await Warehouse.findAll({ where: { id: warehouseIds }, attributes: ['id'] });
            if (found.length !== new Set(warehouseIds).size) {
                throw new AppError('Alguna de las bodegas no existe', 400);
            }
            warehouses = found.map((warehouse) => warehouse.id).sort((a, b) => a - b);
        }

        return {
            name: cleanName,
            description: String(description ?? '').trim() || null,
            permissions: sanitizePermissions(permissions),
            warehouseIds: warehouses,
        };
    }

    static async createProfile(data) {
        return AccessProfile.create(await AccessService.buildProfileData(data));
    }

    static async updateProfile(id, data) {
        const profile = await AccessProfile.findByPk(id);
        if (!profile) {
            throw new AppError('Perfil no encontrado', 404);
        }
        return profile.update(await AccessService.buildProfileData(data, id));
    }

    static async deleteProfile(id) {
        const profile = await AccessProfile.findByPk(id);
        if (!profile) {
            throw new AppError('Perfil no encontrado', 404);
        }
        const assigned = (await Users.count({ where: { accessProfileId: id } }))
            + (await Staff.count({ where: { accessProfileId: id } }));
        if (assigned > 0) {
            throw new AppError(`El perfil está asignado a ${assigned} persona(s). Reasígnalas antes de eliminarlo`, 400);
        }
        await profile.destroy();
    }

    /** Usuarios del panel y personal activos, con su rol anterior y su perfil. */
    static async listPeople() {
        const attributes = ['id', 'firstName', 'lastName', 'email', 'accessProfileId'];
        const [users, staffs] = await Promise.all([
            Users.findAll({ where: { active: true }, attributes, include: [{ model: Roles, as: 'user_rol', attributes: ['name'] }] }),
            Staff.findAll({ where: { active: true }, attributes, include: [{ model: Roles, as: 'rol', attributes: ['name'] }] }),
        ]);
        const toPerson = (kind, roleAlias) => (person) => ({
            kind,
            id: person.id,
            name: `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim(),
            email: person.email,
            role: person[roleAlias]?.name ?? null,
            accessProfileId: person.accessProfileId,
        });
        return [...users.map(toPerson('user', 'user_rol')), ...staffs.map(toPerson('staff', 'rol'))]
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    /** Asigna (o quita, con profileId null) un perfil a varias personas. */
    static async assignProfile({ people, profileId }) {
        if (!Array.isArray(people) || people.length === 0) {
            throw new AppError('No hay personas para asignar', 400);
        }
        if (profileId && !(await AccessProfile.findByPk(profileId))) {
            throw new AppError('Perfil no encontrado', 404);
        }

        const transaction = await db.transaction();
        try {
            for (const [kind, Model] of Object.entries(PEOPLE)) {
                const ids = people.filter((person) => person.kind === kind).map((person) => person.id);
                if (ids.length) {
                    await Model.update({ accessProfileId: profileId ?? null }, { where: { id: ids }, transaction });
                }
            }
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = AccessService;

const AccessService = require('../../services/catalogs/access.services');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');
const { getPublicCatalog } = require('../../utils/accessCatalog');

const decodeId = (value, fieldName) => {
    let id;
    try {
        id = Utils.decode(value);
    } catch {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    return id;
};

const encodeWarehouses = (ids) => (Array.isArray(ids) ? ids.map((id) => Utils.encode(id)) : null);

const serializeProfile = (profile) => ({
    id: Utils.encode(profile.id),
    name: profile.name,
    description: profile.description,
    permissions: profile.permissions ?? {},
    warehouseIds: encodeWarehouses(profile.warehouseIds),
    people: profile.people ?? 0,
});

// null = todas las bodegas; un arreglo (aunque vacío) = solo esas.
const readProfileBody = (body) => ({
    name: body.name,
    description: body.description,
    permissions: body.permissions,
    warehouseIds: Array.isArray(body.warehouseIds)
        ? body.warehouseIds.map((id) => decodeId(id, 'warehouseId'))
        : null,
});

const getMyAccess = async (req, res, next) => {
    try {
        const access = await AccessService.getAccessFor({
            kind: req.userKind,
            id: req.userId ? decodeId(req.userId, 'usuario') : null,
            rol: req.userRol,
        });
        res.status(200).json({
            isSuper: access.isSuper,
            profile: access.profile ? { id: Utils.encode(access.profile.id), name: access.profile.name } : null,
            permissions: access.permissions,
            warehouseIds: encodeWarehouses(access.warehouseIds),
        });
    } catch (error) {
        next(error);
    }
};

const getCatalog = (req, res) => res.status(200).json(getPublicCatalog());

const getProfiles = async (req, res, next) => {
    try {
        res.status(200).json((await AccessService.listProfiles()).map(serializeProfile));
    } catch (error) {
        next(error);
    }
};

const createProfile = async (req, res, next) => {
    try {
        const profile = await AccessService.createProfile(readProfileBody(req.body));
        res.status(200).json(serializeProfile(profile));
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const profile = await AccessService.updateProfile(decodeId(req.params.profile_id, 'profile_id'), readProfileBody(req.body));
        res.status(200).json(serializeProfile(profile));
    } catch (error) {
        next(error);
    }
};

const deleteProfile = async (req, res, next) => {
    try {
        await AccessService.deleteProfile(decodeId(req.params.profile_id, 'profile_id'));
        res.status(200).json({ data: 'resource deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const getPeople = async (req, res, next) => {
    try {
        const people = await AccessService.listPeople();
        res.status(200).json(people.map((person) => ({
            ...person,
            id: Utils.encode(person.id),
            accessProfileId: person.accessProfileId ? Utils.encode(person.accessProfileId) : null,
        })));
    } catch (error) {
        next(error);
    }
};

const assignProfile = async (req, res, next) => {
    try {
        const people = (Array.isArray(req.body.people) ? req.body.people : []).map((person) => {
            if (!['user', 'staff'].includes(person?.kind)) {
                throw new AppError('Tipo de persona inválido', 400);
            }
            return { kind: person.kind, id: decodeId(person.id, 'id') };
        });
        await AccessService.assignProfile({
            people,
            profileId: req.body.profileId ? decodeId(req.body.profileId, 'profileId') : null,
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = { getMyAccess, getCatalog, getProfiles, createProfile, updateProfile, deleteProfile, getPeople, assignProfile };

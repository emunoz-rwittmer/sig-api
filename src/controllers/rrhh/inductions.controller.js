const InductionService = require('../../services/rrhh/inductions.services');
const { toAdminDto } = require('../../utils/inductionPresenters');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');

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

const decodeIds = (values, fieldName) => (values ?? []).map((value) => decodeId(value, fieldName));

const buildInductionPayload = (body) => ({
    name: body.name,
    description: body.description,
    passingScore: body.passingScore !== undefined ? Number(body.passingScore) : undefined,
    maxAttempts: body.maxAttempts !== undefined ? Number(body.maxAttempts) : undefined,
    questionsToShow: body.questionsToShow !== undefined
        ? (body.questionsToShow === null ? null : Number(body.questionsToShow))
        : undefined,
    active: body.active,
    companyIds: body.companyIds ? decodeIds(body.companyIds, 'companyId') : undefined,
    questions: body.questions,
});

const getAll = async (req, res, next) => {
    try {
        const result = await InductionService.list();
        res.status(200).json(result.map(toAdminDto));
    } catch (error) {
        next(error);
    }
};

const getById = async (req, res, next) => {
    try {
        const inductionId = decodeId(req.params.induction_id, 'induction_id');
        const result = await InductionService.getById(inductionId);
        res.status(200).json(toAdminDto(result));
    } catch (error) {
        next(error);
    }
};

const create = async (req, res, next) => {
    try {
        const payload = buildInductionPayload(req.body);
        const induction = await InductionService.create(payload);
        res.status(200).json({ data: 'resource created successfully', inductionId: Utils.encode(induction.id) });
    } catch (error) {
        next(error);
    }
};

const update = async (req, res, next) => {
    try {
        const inductionId = decodeId(req.params.induction_id, 'induction_id');
        const payload = buildInductionPayload(req.body);
        await InductionService.update(inductionId, payload);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

const remove = async (req, res, next) => {
    try {
        const inductionId = decodeId(req.params.induction_id, 'induction_id');
        await InductionService.delete(inductionId);
        res.status(200).json({ data: 'resource deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const addMaterials = async (req, res, next) => {
    try {
        const inductionId = decodeId(req.params.induction_id, 'induction_id');
        const files = req.files ?? [];
        let links = [];
        if (req.body.links) {
            try {
                links = JSON.parse(req.body.links);
            } catch {
                throw new AppError('El campo links debe ser un JSON válido', 400);
            }
        }

        const fileMaterials = files.map((file) => ({
            kind: 'file',
            title: file.originalname,
            url: `/uploads/${req.query.file || 'files'}/${file.filename}`,
            mimeType: file.mimetype,
        }));
        const linkMaterials = links.map((link) => ({
            kind: 'link',
            title: link.title,
            url: link.url,
            mimeType: null,
        }));

        const result = await InductionService.addMaterials(inductionId, [...fileMaterials, ...linkMaterials]);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const removeMaterial = async (req, res, next) => {
    try {
        const materialId = decodeId(req.params.material_id, 'material_id');
        await InductionService.removeMaterial(materialId);
        res.status(200).json({ data: 'resource deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const getStaffProgress = async (req, res, next) => {
    try {
        const inductionId = decodeId(req.params.induction_id, 'induction_id');
        const result = await InductionService.getStaffProgress(inductionId);
        result.forEach((row) => {
            row.staffId = Utils.encode(row.staffId);
            if (row.staff) row.staff.dataValues.id = Utils.encode(row.staff.id);
            if (row.company) row.company.dataValues.id = Utils.encode(row.company.id);
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getForStaff = async (req, res, next) => {
    try {
        const staffId = decodeId(req.params.staff_id, 'staff_id');
        const result = await InductionService.getInductionsForStaff(staffId);
        res.status(200).json(result.map(toAdminDto));
    } catch (error) {
        next(error);
    }
};

const grantExtraAttempt = async (req, res, next) => {
    try {
        const inductionId = decodeId(req.params.induction_id, 'induction_id');
        const staffId = decodeId(req.params.staff_id, 'staff_id');
        await InductionService.grantExtraAttempt(inductionId, staffId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

const InductionController = {
    getAll,
    getById,
    create,
    update,
    remove,
    addMaterials,
    removeMaterial,
    getStaffProgress,
    getForStaff,
    grantExtraAttempt,
};

module.exports = InductionController;

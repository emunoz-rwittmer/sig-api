const YachtService = require('../../services/catalogs/yachts.services');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');

const getAllYachts = async (req, res, next) => {
    try {
        const result = await YachtService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.companyId = Utils.encode(x.dataValues.companyId);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getYacht = async (req, res, next) => {
    try {
        const yachtId = Utils.decode(req.params.yacht_id);
        const result = await YachtService.getYachtById(yachtId);
        if (!result) {
            throw new AppError('Yate no encontrado', 404);
        }
        result.dataValues.id = Utils.encode(result.dataValues.id);
        result.dataValues.companyId = Utils.encode(result.dataValues.companyId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createYacht = async (req, res, next) => {
    try {
        const yacht = req.body;
        yacht.companyId = Utils.decode(yacht.companyId)
        await YachtService.createYacht(yacht);

        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
}

const updateYacht = async (req, res, next) => {
    try {
        const yachtId = Utils.decode(req.params.yacht_id);
        const yacht = req.body;
        delete yacht.id
        yacht.companyId = Utils.decode(yacht.companyId)
        await YachtService.updateYacht(yacht, {
            where: { id: yachtId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteYacht = async (req, res, next) => {
    try {
        const yachtId = Utils.decode(req.params.yacht_id);
        await YachtService.delete({
            where: { id: yachtId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        next(error);
    }
}

const YachtController = {
    getAllYachts,
    getYacht,
    createYacht,
    updateYacht,
    deleteYacht,
}
module.exports = YachtController
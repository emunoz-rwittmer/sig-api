const YachtService = require('../../services/catalogs/yachts.services');
const Utils = require('../../utils/Utils');

const getAllYachts = async (req, res) => {
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
        res.status(400).json(error.message)
    }
}

const getYacht = async (req, res) => {
    try {
        const yachtId = Utils.decode(req.params.yacht_id);
        const result = await YachtService.getYachtById(yachtId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
            result.companyId = Utils.encode(result.companyId);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createYacht = async (req, res) => {
    try {
        const yacht = req.body;
        yacht.companyId = Utils.decode(yacht.companyId)
        await YachtService.createYacht(yacht);

        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updateYacht = async (req, res) => {
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
        res.status(400).json(error.message);
    }
}

const deleteYacht = async (req, res) => {
    try {
        const yachtId = Utils.decode(req.params.yacht_id);
        await YachtService.delete({
            where: { id: yachtId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {

        res.status(400).json(error.message);
    }
}

//PARTS

const getAllParts = async (req, res) => {
    try {
        const result = await YachtService.getAllParts();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.yachtId = Utils.encode(x.dataValues.yachtId);
            });
        }
        res.status(200).json(result);
    } catch (error) {
                console.log(error)

        res.status(400).json(error.message)
    }
}

const createPart = async (req, res) => {
    try {
        const part = req.body;
        part.yachtId = Utils.decode(part.yachtId)
        await YachtService.createPart(part);

        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updatePart = async (req, res) => {
    try {
        const partId = Utils.decode(req.params.part_id);
        const part = req.body;
        part.yachtId = Utils.decode(part.yachtId)
        delete part.id
        await YachtService.updatePart(part, {
            where: { id: partId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}


const YachtController = {
    getAllYachts,
    getYacht,
    createYacht,
    updateYacht,
    deleteYacht,
    getAllParts,
    createPart,
    updatePart

}
module.exports = YachtController
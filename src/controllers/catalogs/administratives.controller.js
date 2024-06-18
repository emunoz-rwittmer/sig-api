const AdministrativeService = require('../../services/catalogs/administratives.services');
const Utils = require('../../utils/Utils');

const getAllAdministratives = async (req, res) => {
    try {
        const company = req.query.company
        const result = await AdministrativeService.getAdministrativesByCompany(company);
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message)
    }
}

const getAdministrative = async (req, res) => {
    try {
        const administrativeId = Utils.decode(req.params.administrative_id);
        const result = await AdministrativeService.getAdministrativeById(administrativeId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createAdministrative = async (req, res) => {
    try {
        const administrative = req.body;
        administrative.yachtId = Utils.decode(req.body.yachtId)
        const result = await AdministrativeService.createAdministrative(administrative);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const updateAdministrative = async (req, res) => {
    try {
        const administrativeId = Utils.decode(req.params.administrative_id);
        const administrative = req.body;
        administrative.yachtId = Utils.decode(req.body.yachtId)
        const result = await AdministrativeService.updateAdministrative(administrative, {
            where: { id: administrativeId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteAdministrative = async (req, res) => {
    try {
        const administrativeId = Utils.decode(req.params.administrative_id);
        const result = await AdministrativeService.delete(administrativeId);
        res.status(200).json({ data: result })
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const AdministrativeController = {
    getAllAdministratives,
    getAdministrative,
    createAdministrative,
    updateAdministrative,
    deleteAdministrative,
}
module.exports = AdministrativeController
const DepartamentService = require('../../services/catalogs/departaments.services');
const Utils = require('../../utils/Utils');

const getDepartaments = async (req, res) => {
    try {
        const result = await DepartamentService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getDepartament = async (req, res) => {
    try {
        const departamentId = Utils.decode(req.params.departament_id);
        const result = await DepartamentService.getDepartamentById(departamentId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createDepartament = async (req, res) => {
    try {
        const departament = req.body;
        const result = await DepartamentService.createDepartament(departament);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const updateDepartament = async (req, res) => {
    try {
        const departamentId = Utils.decode(req.params.departament_id);
        const departament = req.body;
        const result = await DepartamentService.updateDepartament(departament, {
            where: { id: departamentId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteDepartament = async (req, res) => {
    try {
        const departamentId = Utils.decode(req.params.departament_id);
        const result = await DepartamentService.delete(departamentId);
        res.status(200).json({ data: result })
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}


const DepartamentsController = {
    getDepartaments,
    getDepartament,
    createDepartament,
    updateDepartament,
    deleteDepartament
}

module.exports = DepartamentsController 

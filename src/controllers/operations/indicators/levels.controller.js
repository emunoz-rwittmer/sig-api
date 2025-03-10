const LevelService = require('../../../services/operations/indicators/levels.services');
const Utils = require('../../../utils/Utils');

const getAllLevels = async (req, res) => {
    try {
        const result = await LevelService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        console.log(error)
        res.status(500).json(error.message)
    }
}

const getLevel = async (req, res) => {
    try {
        const id = Utils.decode(req.params.level_id);
        const result = await LevelService.getLevelById(id);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json(error.message)
    }
}

const createLevel = async (req, res) => {
    try {
        const data = req.body;
        const result = await LevelService.createLevel(data);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(500).json(error.message);
    }
}



const updateLevel = async (req, res) => {
    try {
        const id = Utils.decode(req.params.level_id);
        const data = req.body;
        const result = await LevelService.updateLevel(data, {
            where: { id },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(500).json(error.message);
    }
}

const deleteLevel = async (req, res) => {
    try {
        const id = Utils.decode(req.params.level_id);
        const result = await LevelService.delete({
            where: { id }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        
        res.status(500).json(error.message);
    }
}

const LevelController = {
    getAllLevels,
    getLevel,
    createLevel,
    updateLevel,
    deleteLevel
}
module.exports = LevelController
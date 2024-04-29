const HouseRuleService = require('../../services/catalogs/houseRules.services');
const Utils = require('../../utils/Utils');

const getAllHouseRules = async (req, res) => {
    try {
        const result = await HouseRuleService.getAll();
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

const getHouseRule = async (req, res) => {
    try {
        const ruleId = Utils.decode(req.params.rule_id);
        const result = await HouseRuleService.getHouseRuleById(ruleId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getRulesBySeverity = async (req, res) => {
    try {
        const severity = req.body.severity;
        const result = await HouseRuleService.getRulesBySeverity(severity);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createHouseRule = async (req, res) => {
    try {
        const HouseRule = req.body;
        const result = await HouseRuleService.createHouseRule(HouseRule);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const updateHouseRule = async (req, res) => {
    try {
        const ruleId = Utils.decode(req.params.rule_id);
        const HouseRule = req.body;
        const result = await HouseRuleService.updateHouseRule(HouseRule, {
            where: { id: ruleId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteHouseRule = async (req, res) => {
    try {
        const ruleId = Utils.decode(req.params.rule_id);
        const result = await HouseRuleService.delete({
            where: { id: ruleId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const HouseRuleController = {
    getAllHouseRules,
    getHouseRule,
    createHouseRule,
    updateHouseRule,
    deleteHouseRule,
    getRulesBySeverity
}
module.exports = HouseRuleController
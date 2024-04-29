const HouseRule = require('../../models/catalogs/houseRule.models');

class HouseRuleService {
    static async getAll() {
        try {
            const result = await HouseRule.findAll({
                attributes: ['id','name','severity','active']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getHouseRuleById(id) {
        try {
            const result = await HouseRule.findOne({
                where: { id },
                attributes: ['id','name','severity','active']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getRulesBySeverity(severity) {
        try {
            const result = await HouseRule.findAll({
                where: { severity },
                attributes: ['id','name','severity','active']
            });
            return result;
        } catch (error) {
            console.log(error)
            throw error;
        }
    }

    static async createHouseRule(houseRule) {
        try {
            const result = await HouseRule.create(houseRule);
            return result;
        } catch (error) {
            throw error;
         
        }
    }

    static async updateHouseRule(houseRule, id) {
        try {
            const result = await HouseRule.update(houseRule,id);
            return result;
        } catch (error) {
            throw error;  
        }
    }

    static async delete(id) {
        try {
            const result = await HouseRule.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports =  HouseRuleService;
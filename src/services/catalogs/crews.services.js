const Crews = require('../../models/catalogs/crews.models');
const Yachts = require('../../models/catalogs/yacht.models');
const CrewYacht = require('../../models/catalogs/crewYacht.models');
const { Op, where } = require("sequelize");



class CrewService {
    static async getAll() {
        try {
            const result = await Crews.findAll({
                attributes: ['id','first_name','last_name','email','cell_phone','active'],
                include: [{
                    model: CrewYacht,
                    as: 'yachts',
                    attributes: ['id'],
                    include: [{
                        model: Yachts,
                        as: 'yacht_crew'
                    }]
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getCrewById(id) {
        try {
            const result = await Crews.findOne({
                where: { id },
                attributes: ['first_name','last_name','email','cell_phone','active']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getCrewsById(arrayIds) {
        try {
            const result = await Crews.findAll({
                where: { id: {
                    [Op.in]: arrayIds
                } },
                attributes: ['id','first_name','last_name','email','cell_phone','active']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createCrew(Crew) {
        try {
            const result = await Crews.create(Crew);
            return result;
        } catch (error) {
            throw error;
         
        }
    }

    static async updateCrew(Crew, id) {
        try {
            const result = await Crews.update(Crew,id);
            return result;
        } catch (error) {
            throw error;  
        }
    }

    static async delete(id) {
        try {
            const result = await Crews.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    // Crew - YACHT 

    static async getAllYachts(id) {
        try {
            const result = await CrewYacht.findAll({
                where: {crewId: id},
                attributes: ['id'],
                include: {
                    model: Yachts,
                    as: 'yacht_crew',
                    attributes: ['name'],
                }
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async assingYacht(data) {
        try {
            const result = await CrewYacht.create(data);
            return result;
        } catch (error) {
            throw error;
         
        }
    }

    static async deleteYacht(id) {
        try {
            const result = await CrewYacht.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports =  CrewService;
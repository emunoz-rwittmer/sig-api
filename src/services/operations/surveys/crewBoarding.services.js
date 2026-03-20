const Company = require('../../../models/catalogs/company.models');
const Departaments = require('../../../models/catalogs/departament.models');
const Positions = require('../../../models/catalogs/positions.models');
const Staff = require('../../../models/catalogs/staff.models');
const StaffCompany = require('../../../models/catalogs/staffCompany.models');
const Yachts = require('../../../models/catalogs/yacht.models');
const { Op, where } = require("sequelize");
const ShipmentDates = require('../../../models/operations/surveys/shipmentDates.models');
const Yacht = require('../../../models/catalogs/yacht.models');


class CrewBoardingService {
    static async getAllYachts() {
        try {
            const result = await Yachts.findAll({
                attributes: ['id', 'name', 'code', 'color', 'companyId', 'active'],
                include: {
                    model: Company,
                    as: 'company',
                    attributes: ['name'],
                    include: {
                        model: StaffCompany,
                        as: 'personal',
                    }
                }
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getYachtWithAllCrew(yachtId) {
        try {
            const result = await Yachts.findOne({
                where: { id: yachtId },
                attributes: ['id', 'name', 'code', 'color', 'companyId', 'active'],
                include: {
                    model: Company,
                    as: 'company',
                    attributes: ['name'],
                    include: {
                        model: StaffCompany,
                        as: 'personal',
                        attributes: ['id'],
                        include: [{
                            model: Staff,
                            as: 'staff',
                            where: {
                                positionId: {
                                    [Op.in]: [1, 2, 3, 4, 5, 6, 7, 12, 13]
                                }
                            },
                            include: [
                                {
                                    model: Departaments,
                                    as: 'staff_departament',
                                    attributes: ['id', 'name'],
                                }, {
                                    model: Positions,
                                    as: 'staff_position',
                                    attributes: ['id', 'name'],
                                }],
                        }, {
                            model: ShipmentDates,
                            as: 'embarques',
                        }]
                    }
                }
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getAllDatesBoardingStaff(staffCompanyId) {
        try {
            const result = await StaffCompany.findOne({
                where: { id: staffCompanyId },
                attributes: ['id'],
                include: [
                    {
                        model: Company,
                        as: 'company',
                        attributes: ['name'],
                        include: [
                            {
                                model: Yacht,
                                as: 'yacht',
                                attributes: ['name'],
                            }],
                    },
                    {
                        model: Staff,
                        as: 'staff',
                        include: [
                            {
                                model: Departaments,
                                as: 'staff_departament',
                                attributes: ['id', 'name'],
                            }, {
                                model: Positions,
                                as: 'staff_position',
                                attributes: ['id', 'name'],
                            }],
                    },
                    {
                        model: ShipmentDates,
                        as: 'embarques',
                        attributes: ['id', 'shipmentDate', 'dischargeDate'],
                    }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createDates(data) {
        try {
            const detailsDate = data.dates.map(detail => ({
                ...detail,
                staffCompanyId: data.staffCompanyId,
            }));

            const result = await ShipmentDates.bulkCreate(detailsDate);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateDate(data, id) {
        try {
            const result = await ShipmentDates.update(data,
                { where: { id } }
            );
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async deleteDate(id) {
        try {
            const result = await ShipmentDates.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = CrewBoardingService;
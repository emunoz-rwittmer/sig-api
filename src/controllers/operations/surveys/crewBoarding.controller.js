const CrewBoardingService = require('../../../services/operations/surveys/crewBoarding.services');
const Utils = require('../../../utils/Utils');

const getAllYachts = async (req, res) => {
    try {
        const result = await CrewBoardingService.getAllYachts();
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

const getYachtWithAllCrew = async (req, res) => {
    try {
        const yachtId = Utils.decode(req.params.yacht_id)
        const result = await CrewBoardingService.getYachtWithAllCrew(yachtId);
        result.dataValues.id = Utils.encode(result.dataValues.id);
        const personal = result.dataValues.company.dataValues.personal
        if (personal instanceof Array) {
            personal.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

//DATES
const getAllDatesBoardingStaff = async (req, res) => {
    try {
        const staffCompanyId = Utils.decode(req.params.staff_company_id);
        const result = await CrewBoardingService.getAllDatesBoardingStaff(staffCompanyId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createDates = async (req, res) => {
    try {
        const data = req.body;
        data.staffCompanyId = Utils.decode(data.staffCompanyId)
        await CrewBoardingService.createDates(data);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updateDate = async (req, res) => {
    try {
        const dateId = req.params.date_id;
        const data = req.body;
        await CrewBoardingService.updateDate(data, dateId);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteDate = async (req, res) => {
    try {
        const dateId = req.params.date_id;
        await CrewBoardingService.deleteDate({
            where: { id: dateId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {

        res.status(400).json(error.message);
    }
}

const CrewBoardingController = {
    getAllYachts,
    getYachtWithAllCrew,
    getAllDatesBoardingStaff,
    createDates,
    updateDate,
    deleteDate
}
module.exports = CrewBoardingController
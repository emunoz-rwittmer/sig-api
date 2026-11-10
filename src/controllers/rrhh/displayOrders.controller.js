const Regulation = require('../../models/rrhh/regulation.models');
const Induction = require('../../models/rrhh/induction.models');
const HrSurvey = require('../../models/rrhh/hrSurvey.models');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');
const { Op } = require('sequelize');

const MODELS = { regulations: Regulation, inductions: Induction, 'hr-surveys': HrSurvey };

// Registros que ya tienen orden, para que los formularios sugieran el siguiente y avisen de choques.
const list = async (req, res, next) => {
    try {
        const Model = MODELS[req.params.module];
        if (!Model) throw new AppError('Módulo inválido', 400);
        const rows = await Model.findAll({
            where: { displayOrder: { [Op.ne]: null } },
            attributes: ['id', 'name', 'displayOrder'],
            order: [['displayOrder', 'ASC']],
        });
        res.status(200).json(rows.map(({ id, name, displayOrder }) => ({ id: Utils.encode(id), name, displayOrder })));
    } catch (error) {
        next(error);
    }
};

module.exports = { list };

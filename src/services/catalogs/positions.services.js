const Positions = require('../../models/catalogs/positions.models');
const Departaments = require('../../models/catalogs/departament.models');
const Staff = require('../../models/catalogs/staff.models');
const Documentation = require('../../models/catalogs/documentation.models');
const Utils = require('../../utils/Utils');

const POSITION_ATTRIBUTES = ['id', 'name', 'departamentId', 'level'];
const DEPARTAMENT_INCLUDE = { model: Departaments, as: 'departament', attributes: ['id', 'name'] };

class PositionService {
    static async getAll() {
        try {
            const result = await Positions.findAll({
                attributes: POSITION_ATTRIBUTES,
                include: [DEPARTAMENT_INCLUDE],
                order:[['name', 'ASC']]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getPositionById(id) {
        try {
            const result = await Positions.findOne({
                where: { id },
                attributes: POSITION_ATTRIBUTES,
                include: [DEPARTAMENT_INCLUDE],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    // Conteos reales para la tabla de Cargos (personas/documentos
    // requeridos) — "documentos requeridos" sale de `documentation.positions`
    // (ya modela ese vínculo, no es campo nuevo), no de una relación nueva.
    static async getStaffAndDocumentCounts() {
        const [staffRows, documentTypes] = await Promise.all([
            Staff.findAll({ attributes: ['positionId'], where: { active: true }, raw: true }),
            Documentation.findAll({ attributes: ['positions'] }),
        ]);

        const staffByPosition = staffRows.reduce((acc, { positionId }) => {
            if (!positionId) return acc;
            acc[positionId] = (acc[positionId] ?? 0) + 1;
            return acc;
        }, {});

        const documentsByPosition = {};
        documentTypes.forEach(({ positions }) => {
            (positions ?? []).forEach((encodedId) => {
                const positionId = Utils.decode(encodedId);
                if (positionId === undefined) return;
                documentsByPosition[positionId] = (documentsByPosition[positionId] ?? 0) + 1;
            });
        });

        return { staffByPosition, documentsByPosition };
    }

    static async createPosition(position) {
        try {
            const result = await Positions.create(position);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updatePosition(position, id) {
        try {
            const result = await Positions.update(position, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async delete(positionId) {
        try {
            const result = await Positions.destroy({
                where: { id: positionId }
            });
            if(result){
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }
}

module.exports =  PositionService;
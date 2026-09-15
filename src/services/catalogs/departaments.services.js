const Departaments = require('../../models/catalogs/departament.models');
const Process = require('../../models/operations/indicators/process.models');
const Staff = require('../../models/catalogs/staff.models');
const Positions = require('../../models/catalogs/positions.models');

const DEPARTAMENT_ATTRIBUTES = ['id', 'name', 'indicators', 'code', 'description', 'responsibleStaffId'];
const RESPONSIBLE_INCLUDE = { model: Staff, as: 'responsible', attributes: ['id', 'firstName', 'lastName'] };

class DepartamentService {
    static async getAll() {
        try {
            const result = await Departaments.findAll({
                attributes: DEPARTAMENT_ATTRIBUTES,
                include: [RESPONSIBLE_INCLUDE],
                order:[['name', 'ASC']]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getDepartamentById(id) {
        try {
            const result = await Departaments.findOne({
                where: { id },
                attributes: DEPARTAMENT_ATTRIBUTES,
                include: [RESPONSIBLE_INCLUDE],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    // Conteos reales para las tarjetas de Áreas (colaboradores/cargos) —
    // mismo criterio que `staffCountsByCompany` en `useStaffList.js`: se
    // agrupa del lado del backend porque acá sí conviene (evita traer el
    // staff completo solo para contar), a diferencia de Staff que ya llega
    // completo a esa pantalla.
    static async getStaffAndPositionCounts() {
        const [staffCounts, positionCounts] = await Promise.all([
            Staff.findAll({
                attributes: ['departamentId'],
                where: { active: true },
                raw: true,
            }),
            Positions.findAll({
                attributes: ['departamentId'],
                raw: true,
            }),
        ]);

        const tally = (rows) => rows.reduce((acc, { departamentId }) => {
            if (!departamentId) return acc;
            acc[departamentId] = (acc[departamentId] ?? 0) + 1;
            return acc;
        }, {});

        return { staffByDepartament: tally(staffCounts), positionsByDepartament: tally(positionCounts) };
    }

    static async getProcessById(id) {
        try {
            const result = await Process.findOne({
                where: { id },
                attributes: ['id','name']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createDepartament(departament) {
        try {
            const result = await Departaments.create(departament);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateDepartament(departament, id) {
        try {
            const result = await Departaments.update(departament, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async delete(departamentId) {
        try {
            const result = await Departaments.destroy({
                where: { id: departamentId }
            });
            if(result){
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }
}

module.exports =  DepartamentService;

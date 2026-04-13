const MaintenanceService = require('../../services/catalogs/maintenance.services');
const Utils = require('../../utils/Utils');

const getAllMaintenances = async (req, res) => {
    try {
        const result = await MaintenanceService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.rules_part.parte.yachtId = Utils.encode(x.dataValues.rules_part.parte.yachtId);
                x.dataValues.materials.map(m => (
                    m.productId = Utils.encode(m.productId)
                ))
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getMaintenancesHistory = async (req, res) => {
    try {
        const result = await MaintenanceService.getMaintenancesHistory();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.partes.map(p => (
                    p.partId = Utils.encode(p.partId),
                    p.parte.yachtId = Utils.encode(p.parte.yachtId)
                ))
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getMaintenance = async (req, res) => {
    try {
        const maintenanceId = Utils.decode(req.params.maintenance_id);
        const result = await MaintenanceService.getMaintenanceById(maintenanceId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createMaintenance = async (req, res) => {
    try {
        const maintenance = req.body;
        maintenance.yachtId = Utils.decode(maintenance.yachtId)
        maintenance.partId = Utils.decode(maintenance.partId)
        maintenance.ruleId = Utils.decode(maintenance.ruleId)

        if (maintenance.products) {
            maintenance.products.map(x => (
                x.productId = Utils.decode(x.productId)
            ));
        }

        await MaintenanceService.createMaintenance(maintenance);

        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        console.log(error)

        res.status(400).json(error.message);
    }
}

const updateMaintenance = async (req, res) => {
    try {
        const maintenanceId = Utils.decode(req.params.maintenance_id);
        const maintenance = req.body;
        delete maintenance.id
        delete maintenance.materials

        if (maintenance.products) {
            maintenance.products.map(x => (
                x.productId = Utils.decode(x.productId)
            ));
        }

        await MaintenanceService.updateMaintenance(maintenance, maintenanceId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const approveMaintenance = async (req, res) => {
    try {
        const maintenanceId = Utils.decode(req.params.maintenance_id);
        const maintenance = req.body;
        delete maintenance.id

        await MaintenanceService.approveMaintenance(maintenance, maintenanceId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteMaintenance = async (req, res) => {
    try {
        const maintenanceId = Utils.decode(req.params.maintenance_id);
        await MaintenanceService.delete({
            where: { id: maintenanceId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {

        res.status(400).json(error.message);
    }
}

//PARTS

const getAllParts = async (req, res) => {
    try {
        const result = await MaintenanceService.getAllParts();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.yachtId = Utils.encode(x.dataValues.yachtId);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createPart = async (req, res) => {
    try {
        const part = req.body;
        part.yachtId = Utils.decode(part.yachtId)
        await MaintenanceService.createPart(part);

        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updatePart = async (req, res) => {
    try {
        const partId = Utils.decode(req.params.part_id);
        const part = req.body;
        part.yachtId = Utils.decode(part.yachtId)
        delete part.id
        await MaintenanceService.updatePart(part, {
            where: { id: partId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

//RULES
const getAllRules = async (req, res) => {
    try {
        const result = await MaintenanceService.getAllRules();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.partes.map(part => (
                    part.partId = Utils.encode(part.partId),
                    part.parte.yachtId = Utils.encode(part.parte.yachtId)
                ))
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createRule = async (req, res) => {
    try {
        const part = req.body;
        part.partIds = part.partIds.map(x => Utils.decode(x))
        await MaintenanceService.createRule(part);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const updateRule = async (req, res) => {
    try {
        const partId = Utils.decode(req.params.part_id);
        const part = req.body;
        part.partIds = part.partIds.map(x => Utils.decode(x))
        delete part.id
        await MaintenanceService.updateRule(part, partId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}


const MaintenanceController = {
    getAllMaintenances,
    getMaintenancesHistory,
    getMaintenance,
    createMaintenance,
    updateMaintenance,
    approveMaintenance,
    deleteMaintenance,
    getAllParts,
    createPart,
    updatePart,
    getAllRules,
    createRule,
    updateRule

}
module.exports = MaintenanceController
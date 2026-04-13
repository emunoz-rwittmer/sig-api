const { Router } = require('express');
const MaintenanceController = require('../../controllers/catalogs/maintenance.controller');

const router = Router();

// MAINTENANCE
router.get('/', MaintenanceController.getAllMaintenances);
router.get('/history_ship', MaintenanceController.getMaintenancesHistory);
router.post('/', MaintenanceController.createMaintenance);
router.put('/:maintenance_id', MaintenanceController.updateMaintenance);
router.put('/:maintenance_id/approve', MaintenanceController.approveMaintenance);
//PARTS
router.get('/parts/allParts', MaintenanceController.getAllParts);
router.post('/parts/createPart', MaintenanceController.createPart);
router.put('/parts/updatePart/:part_id', MaintenanceController.updatePart);
// RULES
router.get('/rules/allRules', MaintenanceController.getAllRules);
router.post('/rules/createRule', MaintenanceController.createRule);
router.put('/rules/updateRule/:part_id', MaintenanceController.updateRule);



module.exports = router;
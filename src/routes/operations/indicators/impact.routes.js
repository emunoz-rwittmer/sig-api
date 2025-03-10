const { Router } = require('express');
const ImpactController  = require ('../../../controllers/operations/indicators/impact.controller');

const router = Router();

router.get('/',ImpactController.getAllImpacts);
router.get('/:impact_id',ImpactController.getImpact);
router.post('/',ImpactController.createImpact);
router.put('/:impact_id',ImpactController.updateImpact);
router.delete('/:impact_id',ImpactController.deleteImpact);


module.exports = router;
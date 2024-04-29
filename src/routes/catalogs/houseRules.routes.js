const { Router } = require('express');
const HouseRuleController  = require ('../../controllers/catalogs/houseRules.controller');

const router = Router();

router.get('/',HouseRuleController.getAllHouseRules);
router.get('/:rule_id',HouseRuleController.getHouseRule);
router.post('/getRulesBySeverity',HouseRuleController.getRulesBySeverity);
router.post('/createHouseRule',HouseRuleController.createHouseRule);
router.put('/updateHouseRule/:rule_id',HouseRuleController.updateHouseRule);
router.delete('/:rule_id',HouseRuleController.deleteHouseRule);


module.exports = router;
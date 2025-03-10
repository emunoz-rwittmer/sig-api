const { Router } = require('express');
const LevelController  = require ('../../../controllers/operations/indicators/levels.controller');

const router = Router();

router.get('/',LevelController.getAllLevels);
router.get('/:level_id',LevelController.getLevel);
router.post('/',LevelController.createLevel);
router.put('/:level_id',LevelController.updateLevel);
router.delete('/:level_id',LevelController.deleteLevel);


module.exports = router;
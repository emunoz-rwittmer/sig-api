const { Router } = require('express');
const CrewController  = require ('../../controllers/catalogs/crews.controller');

const router = Router();

router.get('/',CrewController.getAllCrews);
router.get('/:crew_id',CrewController.getCrew);
router.post('/createCrew',CrewController.createCrew);
router.put('/updateCrew/:crew_id',CrewController.updateCrew);
router.delete('/:crew_id',CrewController.deleteCrew);

//crew yachts
router.get('/:crew_id/yachts',CrewController.getAllYachts);
router.post('/:crew_id/assingYacht',CrewController.assingYacht);
router.delete('/:crew_id/yacht/:id',CrewController.deleteYacht);


module.exports = router;
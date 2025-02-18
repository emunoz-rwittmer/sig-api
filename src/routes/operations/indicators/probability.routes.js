const { Router } = require('express');
const ProbabilityController  = require ('../../../controllers/operations/indicators/probability.controller');

const router = Router();

router.get('/',ProbabilityController.getAllProbabilities);
router.get('/:probability_id',ProbabilityController.getProbability);
router.post('/',ProbabilityController.createProbability);
router.put('/:probability_id',ProbabilityController.updateProbability);
router.delete('/:probability_id',ProbabilityController.deleteProbability);


module.exports = router;
const { Router } = require('express');
const EvaluationController  = require ('../../../controllers/operations/surveys/evaluations.controller');

const router = Router();

router.get('/',EvaluationController.getAllEvaluations);
router.get('/:evaluation_id',EvaluationController.getEvaluation);
router.get('/reportingByYacht/:yacht_id',EvaluationController.getReportingByYacht);
router.get('/reportingByDepartament/:departament_id',EvaluationController.getReportingByDepartament);
router.get('/reportingEvaluationsByCrew/:crew_id',EvaluationController.getReportingEvaluationsByCrew);
router.post('/respondEvaluation',EvaluationController.respondEvaluation);



module.exports = router;
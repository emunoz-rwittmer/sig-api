const { Router } = require('express');
const EvaluationController  = require ('../../../controllers/operations/surveys/evaluations.controller');

const router = Router();

router.get('/',EvaluationController.getAllEvaluations);
router.get('/:evaluation_id',EvaluationController.getEvaluation);
router.get('/evaluationsSent/ToDay',EvaluationController.getEvaluationsToDay);
//reporting
router.get('/reportingByCompany/:company_id',EvaluationController.getReportingByCompany);
router.get('/reportingByDepartament/:departament_id',EvaluationController.getReportingByDepartament);
router.get('/reportingEvaluationsByCrew/:crew_id',EvaluationController.getReportingEvaluationsByCrew);
//operations
router.post('/:evaluation_id/respondEvaluation',EvaluationController.respondEvaluation);
router.delete('/:evaluation_id',EvaluationController.deleteEvaluation);



module.exports = router;
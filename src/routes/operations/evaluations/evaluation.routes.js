const { Router } = require('express');
const EvaluationController  = require ('../../../controllers/operations/evaluations/evaluations.controller');

const router = Router();

router.get('/',EvaluationController.getAllEvaluations);
router.get('/:evaluation_id',EvaluationController.getEvaluation);
router.post('/respondEvaluation',EvaluationController.respondEvaluation);
// router.post('/createForm',EvaluationController.createForm);
// router.put('/updateForm/:form_id',EvaluationController.updateForm);
// router.delete('/:form_id',EvaluationController.deleteForm);
// router.delete('/deleteQuestionForm/:form_id/question/:question_id',EvaluationController.deleteQuestionForm);
// //SEARCH CREW
// router.get('/serchCrew/:yacht_id',EvaluationController.serchCrew);
// router.post('/sendEvaluation',EvaluationController.sendEvaluation);


module.exports = router;
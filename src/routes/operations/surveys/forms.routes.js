const { Router } = require('express');
const FormController  = require ('../../../controllers/operations/surveys/forms.controller');

const router = Router();

router.get('/',FormController.getAllForms);
router.get('/:form_id',FormController.getForm);
router.post('/createForm',FormController.createForm);
router.put('/updateForm/:form_id',FormController.updateForm);
router.delete('/:form_id',FormController.deleteForm);
router.delete('/deleteQuestionForm/:form_id/question/:question_id',FormController.deleteQuestionForm);
//SEARCH CREW
router.get('/formWhitAllNecesary/:form_id',FormController.getFormAllNecesary);
router.post('/sendEvaluation',FormController.sendEvaluation);


module.exports = router;
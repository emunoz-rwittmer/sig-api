const { Router } = require('express');
const QuestionController  = require ('../../../controllers/operations/surveys/questions.controller');

const router = Router();

router.get('/',QuestionController.getAllQuestions);
router.get('/:question_id',QuestionController.getQuestion);
router.post('/createQuestion',QuestionController.createQuestion);
router.put('/updateQuestion/:question_id',QuestionController.updateQuestion);
router.delete('/:question_id',QuestionController.deleteQuestion);


module.exports = router;
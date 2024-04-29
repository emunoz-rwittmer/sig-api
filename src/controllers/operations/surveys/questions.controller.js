const QuestionService = require('../../../services/operations/surveys/questions.services');
const Utils = require('../../../utils/Utils');

const getAllQuestions = async (req, res) => {
    try {
        const result = await QuestionService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getQuestion = async (req, res) => {
    try {
        const questionId = Utils.decode(req.params.question_id);
        const result = await QuestionService.getQuestionById(questionId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createQuestion = async (req, res) => {
    try {
        const question = req.body;
        const result = await QuestionService.createQuestion(question);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}



const updateQuestion = async (req, res) => {
    try {
        const questionId = Utils.decode(req.params.question_id);
        const question = req.body;
        const result = await QuestionService.updateQuestion(question, {
            where: { id: questionId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteQuestion = async (req, res) => {
    try {
        const questionId = Utils.decode(req.params.question_id);
        const result = await QuestionService.delete({
            where: { id: questionId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const QuestionController = {
    getAllQuestions,
    getQuestion,
    createQuestion,
    updateQuestion,
    deleteQuestion
}
module.exports = QuestionController
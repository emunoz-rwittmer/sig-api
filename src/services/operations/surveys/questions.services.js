const Questions = require('../../../models/operations/surveys/question.models');
const FormQuestion = require('../../../models/operations/surveys/formQuestion.models');

class QuestionService {
    static async getAll() {
        try {
            const result = await Questions.findAll({
                attributes: ['id', 'name', 'active', 'category', 'positionId'],
                order: [['active', 'DESC']]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    // Cuántos formularios usan cada pregunta del banco — mismo criterio que
    // `staffByPosition` en positions.services.js (reduce en JS sobre las
    // filas crudas, no GROUP BY en SQL).
    static async getUsageCounts() {
        const rows = await FormQuestion.findAll({ attributes: ['questionId'], raw: true });
        return rows.reduce((acc, { questionId }) => {
            if (!questionId) return acc;
            acc[questionId] = (acc[questionId] ?? 0) + 1;
            return acc;
        }, {});
    }

    static async getQuestionById(id) {
        try {
            const result = await Questions.findOne({
                where: { id },
                attributes: ['id', 'name', 'active', 'category', 'positionId']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createQuestion(question) {
        try {
            const result = await Questions.create(question);
            return result;
        } catch (error) {
            throw error;
         
        }
    }

    static async updateQuestion(question, id) {
        try {
            const result = await Questions.update(question,id);
            return result;
        } catch (error) {
            throw error;  
        }
    }

    static async delete(id) {
        try {
            const result = await Questions.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports =  QuestionService;
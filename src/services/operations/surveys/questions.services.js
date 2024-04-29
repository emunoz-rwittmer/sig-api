const Questions = require('../../../models/operations/surveys/question.models');

class QuestionService {
    static async getAll() {
        try {
            const result = await Questions.findAll({
                attributes: ['id','name','active']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getQuestionById(id) {
        try {
            const result = await Questions.findOne({
                where: { id },
                attributes: ['id','name','active']
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
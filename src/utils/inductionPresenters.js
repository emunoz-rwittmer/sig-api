const Utils = require('./Utils');

function encodeOption(option, { includeCorrect }) {
    const data = { ...option.dataValues };
    data.id = Utils.encode(option.id);
    if (!includeCorrect) delete data.isCorrect;
    return data;
}

function encodeQuestion(question, { includeCorrect }) {
    const data = { ...question.dataValues };
    data.id = Utils.encode(question.id);
    data.options = (question.dataValues.options ?? []).map((option) => encodeOption(option, { includeCorrect }));
    return data;
}

function encodeMaterial(material) {
    const data = { ...material.dataValues };
    data.id = Utils.encode(material.id);
    return data;
}

function encodeInductionBase(induction) {
    const data = { ...induction.dataValues };
    data.id = Utils.encode(induction.id);
    if (data.companies) {
        data.companies = data.companies.map((entry) => ({
            ...entry.dataValues,
            id: Utils.encode(entry.id),
            companyId: Utils.encode(entry.companyId),
        }));
    }
    if (data.materials) {
        data.materials = data.materials.map(encodeMaterial);
    }
    return data;
}

function toAdminDto(induction) {
    const data = encodeInductionBase(induction);
    if (data.questions) {
        data.questions = data.questions.map((question) => encodeQuestion(question, { includeCorrect: true }));
    }
    return data;
}

function toStaffDto(induction) {
    const data = encodeInductionBase(induction);
    if (data.questions) {
        data.questions = data.questions.map((question) => encodeQuestion(question, { includeCorrect: false }));
    }
    return data;
}

function toAttemptDto(attempt) {
    const data = { ...attempt.dataValues };
    data.id = Utils.encode(attempt.id);
    return data;
}

module.exports = {
    toAdminDto,
    toStaffDto,
    toAttemptDto,
};

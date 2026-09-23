const db = require('../../utils/database');
const Company = require('../../models/catalogs/company.models');
const Staff = require('../../models/catalogs/staff.models');
const StaffCompany = require('../../models/catalogs/staffCompany.models');
const Induction = require('../../models/rrhh/induction.models');
const InductionCompany = require('../../models/rrhh/inductionCompany.models');
const InductionMaterial = require('../../models/rrhh/inductionMaterial.models');
const InductionQuestion = require('../../models/rrhh/inductionQuestion.models');
const InductionOption = require('../../models/rrhh/inductionOption.models');
const InductionProgress = require('../../models/rrhh/inductionProgress.models');
const InductionAttempt = require('../../models/rrhh/inductionAttempt.models');
const { validateQuestionSet, validateQuestionsToShow, remainingAttempts, resolveStatus } = require('../../utils/inductionScoring');
const AppError = require('../../errors/AppError');

const FULL_INCLUDE = [
    { model: InductionCompany, as: 'companies', include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }] },
    { model: InductionMaterial, as: 'materials' },
    {
        model: InductionQuestion,
        as: 'questions',
        include: [{ model: InductionOption, as: 'options' }],
    },
];

async function getAssignedStaffIds(companyIds) {
    if (!companyIds.length) return [];
    const rows = await StaffCompany.findAll({
        where: { companyId: companyIds },
        include: [{ model: Staff, as: 'staff', attributes: [], where: { active: true } }],
        attributes: ['staffId'],
        group: ['staffId'],
    });
    return rows.map((row) => row.staffId);
}

class InductionService {
    static async list() {
        const inductions = await Induction.findAll({
            include: FULL_INCLUDE,
            order: [['createdAt', 'DESC']],
        });

        return Promise.all(inductions.map(async (induction) => {
            const companyIds = induction.companies.map((entry) => entry.companyId);
            const staffIds = await getAssignedStaffIds(companyIds);
            const passedCount = staffIds.length
                ? await InductionAttempt.count({
                    where: { inductionId: induction.id, staffId: staffIds, passed: true },
                    distinct: true,
                    col: 'staffId',
                })
                : 0;

            induction.dataValues.assignedCount = staffIds.length;
            induction.dataValues.passedCount = passedCount;
            induction.dataValues.pendingCount = staffIds.length - passedCount;
            return induction;
        }));
    }

    static async getById(id) {
        const induction = await Induction.findByPk(id, { include: FULL_INCLUDE });
        if (!induction) throw new AppError('Inducción no encontrada', 404);
        return induction;
    }

    static async create(data) {
        const validationError = validateQuestionSet(data.questions);
        if (validationError) throw new AppError(validationError, 400);
        const questionsToShowError = validateQuestionsToShow(data.questionsToShow, data.questions.length);
        if (questionsToShowError) throw new AppError(questionsToShowError, 400);
        if (!Array.isArray(data.companyIds) || !data.companyIds.length) {
            throw new AppError('Debe asignar al menos una empresa', 400);
        }

        return db.transaction(async (transaction) => {
            const induction = await Induction.create({
                name: data.name,
                description: data.description ?? null,
                passingScore: data.passingScore,
                maxAttempts: data.maxAttempts,
                questionsToShow: data.questionsToShow ?? null,
                active: data.active ?? true,
            }, { transaction });

            await InductionCompany.bulkCreate(
                data.companyIds.map((companyId) => ({ inductionId: induction.id, companyId })),
                { transaction },
            );

            await createQuestions(induction.id, data.questions, transaction);

            return induction;
        });
    }

    static async update(id, data) {
        const induction = await Induction.findByPk(id);
        if (!induction) throw new AppError('Inducción no encontrada', 404);

        if (data.questions) {
            const validationError = validateQuestionSet(data.questions);
            if (validationError) throw new AppError(validationError, 400);
        }
        if (data.questionsToShow !== undefined) {
            const totalQuestions = data.questions
                ? data.questions.length
                : await InductionQuestion.count({ where: { inductionId: id } });
            const questionsToShowError = validateQuestionsToShow(data.questionsToShow, totalQuestions);
            if (questionsToShowError) throw new AppError(questionsToShowError, 400);
        }
        if (data.companyIds && !data.companyIds.length) {
            throw new AppError('Debe asignar al menos una empresa', 400);
        }

        return db.transaction(async (transaction) => {
            await induction.update({
                name: data.name ?? induction.name,
                description: data.description !== undefined ? data.description : induction.description,
                passingScore: data.passingScore ?? induction.passingScore,
                maxAttempts: data.maxAttempts ?? induction.maxAttempts,
                questionsToShow: data.questionsToShow !== undefined ? data.questionsToShow : induction.questionsToShow,
                active: data.active !== undefined ? data.active : induction.active,
            }, { transaction });

            if (data.companyIds) {
                await InductionCompany.destroy({ where: { inductionId: id }, transaction });
                await InductionCompany.bulkCreate(
                    data.companyIds.map((companyId) => ({ inductionId: id, companyId })),
                    { transaction },
                );
            }

            if (data.questions) {
                // Reemplazo atómico: las preguntas/opciones no tienen edición
                // incremental en el formulario, se reenvía el set completo.
                await InductionQuestion.destroy({ where: { inductionId: id }, transaction });
                await createQuestions(id, data.questions, transaction);
            }

            return induction;
        });
    }

    static async delete(id) {
        const deleted = await Induction.destroy({ where: { id } });
        if (!deleted) throw new AppError('Inducción no encontrada', 404);
        return deleted;
    }

    static async addMaterials(inductionId, materials) {
        const induction = await Induction.findByPk(inductionId);
        if (!induction) throw new AppError('Inducción no encontrada', 404);
        if (!materials.length) throw new AppError('No se recibió ningún material', 400);

        await InductionMaterial.bulkCreate(
            materials.map((material, index) => ({ ...material, inductionId, sortOrder: index })),
        );
        return InductionMaterial.findAll({ where: { inductionId } });
    }

    static async removeMaterial(materialId) {
        const deleted = await InductionMaterial.destroy({ where: { id: materialId } });
        if (!deleted) throw new AppError('Material no encontrado', 404);
        return deleted;
    }

    static async getStaffProgress(inductionId) {
        const induction = await Induction.findByPk(inductionId, {
            include: [{ model: InductionCompany, as: 'companies' }],
        });
        if (!induction) throw new AppError('Inducción no encontrada', 404);

        const companyIds = induction.companies.map((entry) => entry.companyId);
        const staffCompanies = await StaffCompany.findAll({
            where: { companyId: companyIds },
            include: [
                { model: Staff, as: 'staff', where: { active: true }, attributes: ['id', 'firstName', 'lastName'] },
                { model: Company, as: 'company', attributes: ['id', 'name'] },
            ],
            order: [[{ model: Staff, as: 'staff' }, 'lastName', 'ASC']],
        });

        const staffIds = [...new Set(staffCompanies.map((entry) => entry.staffId))];
        const [progressRows, attempts] = await Promise.all([
            InductionProgress.findAll({ where: { inductionId, staffId: staffIds } }),
            InductionAttempt.findAll({ where: { inductionId, staffId: staffIds }, order: [['createdAt', 'ASC']] }),
        ]);

        const progressByStaff = new Map(progressRows.map((row) => [row.staffId, row]));
        const attemptsByStaff = new Map();
        attempts.forEach((attempt) => {
            const list = attemptsByStaff.get(attempt.staffId) ?? [];
            list.push(attempt);
            attemptsByStaff.set(attempt.staffId, list);
        });

        const seen = new Set();
        return staffCompanies
            .filter((entry) => {
                if (seen.has(entry.staffId)) return false;
                seen.add(entry.staffId);
                return true;
            })
            .map((entry) => buildStaffProgressRow(induction, entry, progressByStaff, attemptsByStaff));
    }

    static async grantExtraAttempt(inductionId, staffId) {
        const induction = await Induction.findByPk(inductionId);
        if (!induction) throw new AppError('Inducción no encontrada', 404);

        const [progress] = await InductionProgress.findOrCreate({
            where: { inductionId, staffId },
            defaults: { inductionId, staffId },
        });
        await progress.increment('extraAttempts', { by: 1 });
        return progress.reload();
    }

    static async getInductionsForStaff(staffId) {
        const companyIds = (await StaffCompany.findAll({ where: { staffId }, attributes: ['companyId'] }))
            .map((entry) => entry.companyId);
        if (!companyIds.length) return [];

        const inductionIds = (await InductionCompany.findAll({ where: { companyId: companyIds }, attributes: ['inductionId'] }))
            .map((entry) => entry.inductionId);
        if (!inductionIds.length) return [];

        const inductions = await Induction.findAll({
            where: { id: [...new Set(inductionIds)] },
            order: [['createdAt', 'DESC']],
        });
        const attempts = await InductionAttempt.findAll({ where: { inductionId: inductions.map((i) => i.id), staffId } });
        const progressRows = await InductionProgress.findAll({ where: { inductionId: inductions.map((i) => i.id), staffId } });

        const attemptsByInduction = new Map();
        attempts.forEach((attempt) => {
            const list = attemptsByInduction.get(attempt.inductionId) ?? [];
            list.push(attempt);
            attemptsByInduction.set(attempt.inductionId, list);
        });
        const progressByInduction = new Map(progressRows.map((row) => [row.inductionId, row]));

        return inductions.map((induction) => {
            const staffAttempts = attemptsByInduction.get(induction.id) ?? [];
            const bestScore = staffAttempts.length ? Math.max(...staffAttempts.map((attempt) => Number(attempt.score))) : null;
            const progress = progressByInduction.get(induction.id);
            const remaining = remainingAttempts({
                maxAttempts: induction.maxAttempts,
                extraAttempts: progress?.extraAttempts ?? 0,
                usedAttempts: staffAttempts.length,
            });
            induction.dataValues.bestScore = bestScore;
            induction.dataValues.attemptsUsed = staffAttempts.length;
            induction.dataValues.remainingAttempts = remaining;
            induction.dataValues.status = resolveStatus({
                materialViewedAt: progress?.materialViewedAt ?? null,
                bestScore,
                passingScore: induction.passingScore,
                remaining,
            });
            return induction;
        });
    }
}

async function createQuestions(inductionId, questions, transaction) {
    for (let index = 0; index < questions.length; index += 1) {
        const question = await InductionQuestion.create({
            inductionId,
            statement: questions[index].statement,
            sortOrder: index,
        }, { transaction });

        await InductionOption.bulkCreate(
            questions[index].options.map((option, optionIndex) => ({
                questionId: question.id,
                text: option.text,
                isCorrect: Boolean(option.isCorrect),
                sortOrder: optionIndex,
            })),
            { transaction },
        );
    }
}

function buildStaffProgressRow(induction, staffCompanyEntry, progressByStaff, attemptsByStaff) {
    const staffAttempts = attemptsByStaff.get(staffCompanyEntry.staffId) ?? [];
    const bestScore = staffAttempts.length ? Math.max(...staffAttempts.map((attempt) => Number(attempt.score))) : null;
    const progress = progressByStaff.get(staffCompanyEntry.staffId);
    const remaining = remainingAttempts({
        maxAttempts: induction.maxAttempts,
        extraAttempts: progress?.extraAttempts ?? 0,
        usedAttempts: staffAttempts.length,
    });

    return {
        staffId: staffCompanyEntry.staffId,
        staff: staffCompanyEntry.staff,
        company: staffCompanyEntry.company,
        bestScore,
        attemptsUsed: staffAttempts.length,
        maxAttempts: induction.maxAttempts + (progress?.extraAttempts ?? 0),
        remainingAttempts: remaining,
        status: resolveStatus({
            materialViewedAt: progress?.materialViewedAt ?? null,
            bestScore,
            passingScore: induction.passingScore,
            remaining,
        }),
    };
}

module.exports = InductionService;

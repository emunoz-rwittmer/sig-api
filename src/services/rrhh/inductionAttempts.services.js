const StaffCompany = require('../../models/catalogs/staffCompany.models');
const Induction = require('../../models/rrhh/induction.models');
const InductionCompany = require('../../models/rrhh/inductionCompany.models');
const InductionMaterial = require('../../models/rrhh/inductionMaterial.models');
const InductionQuestion = require('../../models/rrhh/inductionQuestion.models');
const InductionOption = require('../../models/rrhh/inductionOption.models');
const InductionProgress = require('../../models/rrhh/inductionProgress.models');
const InductionAttempt = require('../../models/rrhh/inductionAttempt.models');
const InductionService = require('./inductions.services');
const { gradeAttempt, remainingAttempts, resolveStatus } = require('../../utils/inductionScoring');
const AppError = require('../../errors/AppError');

async function assertStaffAssigned(staffId, inductionId) {
    const induction = await Induction.findByPk(inductionId, {
        include: [
            { model: InductionCompany, as: 'companies' },
            { model: InductionMaterial, as: 'materials' },
            { model: InductionQuestion, as: 'questions', include: [{ model: InductionOption, as: 'options' }] },
        ],
    });
    if (!induction) throw new AppError('Inducción no encontrada', 404);

    const companyIds = induction.companies.map((entry) => entry.companyId);
    const assigned = await StaffCompany.count({ where: { staffId, companyId: companyIds } });
    if (!assigned) throw new AppError('Esta inducción no está asignada a tu empresa', 403);

    return induction;
}

class InductionAttemptService {
    static async listMine(staffId) {
        return InductionService.getInductionsForStaff(staffId);
    }

    static async getMineDetail(staffId, inductionId) {
        const induction = await assertStaffAssigned(staffId, inductionId);
        const [progress, attempts] = await Promise.all([
            InductionProgress.findOne({ where: { inductionId, staffId } }),
            InductionAttempt.findAll({ where: { inductionId, staffId }, order: [['createdAt', 'DESC']] }),
        ]);

        const bestScore = attempts.length ? Math.max(...attempts.map((attempt) => Number(attempt.score))) : null;
        const remaining = remainingAttempts({
            maxAttempts: induction.maxAttempts,
            extraAttempts: progress?.extraAttempts ?? 0,
            usedAttempts: attempts.length,
        });

        induction.dataValues.materialViewedAt = progress?.materialViewedAt ?? null;
        induction.dataValues.bestScore = bestScore;
        induction.dataValues.attemptsUsed = attempts.length;
        induction.dataValues.remainingAttempts = remaining;
        induction.dataValues.status = resolveStatus({
            materialViewedAt: progress?.materialViewedAt ?? null,
            bestScore,
            passingScore: induction.passingScore,
            remaining,
        });

        return induction;
    }

    static async markViewed(staffId, inductionId) {
        await assertStaffAssigned(staffId, inductionId);

        const [progress] = await InductionProgress.findOrCreate({
            where: { inductionId, staffId },
            defaults: { inductionId, staffId },
        });
        if (!progress.materialViewedAt) {
            await progress.update({ materialViewedAt: new Date() });
        }
        return progress;
    }

    static async submitAttempt(staffId, inductionId, answers) {
        const induction = await assertStaffAssigned(staffId, inductionId);

        const progress = await InductionProgress.findOne({ where: { inductionId, staffId } });
        if (!progress?.materialViewedAt) {
            throw new AppError('Debes revisar el material antes de rendir el cuestionario', 400);
        }

        const usedAttempts = await InductionAttempt.count({ where: { inductionId, staffId } });
        const remaining = remainingAttempts({
            maxAttempts: induction.maxAttempts,
            extraAttempts: progress.extraAttempts,
            usedAttempts,
        });
        if (remaining <= 0) {
            throw new AppError('Alcanzaste el número máximo de intentos para esta inducción', 400);
        }

        const validQuestionIds = new Set(induction.questions.map((question) => question.id));
        const validOptionIds = new Set(induction.questions.flatMap((question) => question.options.map((option) => option.id)));
        const invalidAnswer = (answers ?? []).some(
            (answer) => !validQuestionIds.has(answer.questionId) || !validOptionIds.has(answer.optionId),
        );
        if (invalidAnswer) {
            throw new AppError('La respuesta enviada no pertenece a esta inducción', 400);
        }

        const graded = gradeAttempt(induction.questions, answers);
        const passed = graded.score >= induction.passingScore;

        await InductionAttempt.create({
            inductionId,
            staffId,
            correctCount: graded.correctCount,
            totalQuestions: graded.total,
            score: graded.score,
            passed,
            answers,
        });

        return {
            correctCount: graded.correctCount,
            total: graded.total,
            score: graded.score,
            passed,
            remainingAttempts: remainingAttempts({
                maxAttempts: induction.maxAttempts,
                extraAttempts: progress.extraAttempts,
                usedAttempts: usedAttempts + 1,
            }),
        };
    }
}

module.exports = InductionAttemptService;

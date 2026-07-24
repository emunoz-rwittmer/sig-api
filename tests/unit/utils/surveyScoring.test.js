const SurveyScoring = require('../../../src/utils/surveyScoring');

describe('surveyScoring utils', () => {
    it('reconoce un número solo (1-5)', () => {
        expect(SurveyScoring.asignarPuntaje('3')).toBe(3);
    });

    it('reconoce un número entre paréntesis al final', () => {
        expect(SurveyScoring.asignarPuntaje('Muy bueno (4)')).toBe(4);
    });

    it('reconoce texto mapeado a puntaje', () => {
        expect(SurveyScoring.asignarPuntaje('Excelente')).toBe(5);
        expect(SurveyScoring.asignarPuntaje('Regular')).toBe(2);
    });

    it('devuelve el texto original si no matchea ningún patrón', () => {
        expect(SurveyScoring.asignarPuntaje('Respuesta libre')).toBe('Respuesta libre');
    });

    it('devuelve null para input no-string o vacío', () => {
        expect(SurveyScoring.asignarPuntaje(null)).toBeNull();
        expect(SurveyScoring.asignarPuntaje(undefined)).toBeNull();
    });
});

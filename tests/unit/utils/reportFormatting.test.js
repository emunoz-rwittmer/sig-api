const { extractApellido, capitalizeYachtName, extractNombres } = require('../../../src/utils/reportFormatting');

describe('reportFormatting utils', () => {
    describe('extractApellido', () => {
        it('toma las ultimas 2 palabras como apellido (patron 2 nombres + 2 apellidos)', () => {
            expect(extractApellido('Juan Carlos Perez Gomez')).toBe('Perez Gomez');
        });

        it('devuelve la unica palabra disponible si el nombre no tiene 2+ palabras', () => {
            expect(extractApellido('Madonna')).toBe('Madonna');
        });

        it('devuelve string vacio para input vacio o no-string', () => {
            expect(extractApellido('')).toBe('');
            expect(extractApellido(null)).toBe('');
            expect(extractApellido(undefined)).toBe('');
        });

        it('ignora espacios extra entre palabras', () => {
            expect(extractApellido('Ana   Maria   Lopez   Ruiz')).toBe('Lopez Ruiz');
        });
    });

    describe('extractNombres', () => {
        it('toma las primeras 2 palabras como nombres (patron 2 nombres + 2 apellidos)', () => {
            expect(extractNombres('Juan Carlos Perez Gomez')).toBe('Juan Carlos');
        });

        it('devuelve string vacio si hay 2 o menos palabras (no se puede separar nombres de apellidos)', () => {
            expect(extractNombres('Madonna')).toBe('');
            expect(extractNombres('Ana Lopez')).toBe('');
        });

        it('devuelve string vacio para input vacio o no-string', () => {
            expect(extractNombres('')).toBe('');
            expect(extractNombres(null)).toBe('');
            expect(extractNombres(undefined)).toBe('');
        });
    });

    describe('capitalizeYachtName', () => {
        it('capitaliza cada palabra dejando los numeros romanos en mayuscula', () => {
            expect(capitalizeYachtName('TIP TOP II')).toBe('Tip Top II');
            expect(capitalizeYachtName('TIP TOP IV')).toBe('Tip Top IV');
            expect(capitalizeYachtName('TIP TOP V')).toBe('Tip Top V');
        });

        it('capitaliza nombres de una sola palabra sin numero romano', () => {
            expect(capitalizeYachtName('KOLN')).toBe('Koln');
        });

        it('devuelve el valor tal cual si no es un string', () => {
            expect(capitalizeYachtName(null)).toBeNull();
            expect(capitalizeYachtName(undefined)).toBeUndefined();
        });
    });
});

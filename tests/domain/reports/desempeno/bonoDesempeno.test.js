const { buildCumplimiento, criterionOf } = require('../../../../src/services/reports/bonoDesempeno.services');

const cap = { id: 1, firstName: 'Ana', lastName: 'Mar', staff_position: { name: 'Capitán' } };
const marinero = { id: 2, firstName: 'Luis', lastName: 'Sol', staff_position: { name: 'Timonel / Marinero' } };
const row = (form, evaluated, month, answer, state = 'Completada') => ({
    formulario: { name: form },
    evaluated,
    state,
    updatedAt: new Date(2026, month, 10),
    respuestas: [{ answer }],
});
const base = { docs: [], incidents: [], anio: 2026, semestre: 1 };

describe('criterionOf', () => {
    it('mapea los formularios por nombre', () => {
        expect(criterionOf('Evaluación Operaciones - Capitanes')).toBe('cap_operaciones');
        expect(criterionOf('Evaluación Administrativa - Capitanes')).toBe('cap_administrativa');
        expect(criterionOf('Evaluación Liderazgo - Capitanes')).toBe('cap_liderazgo');
        expect(criterionOf('Servicio de Hotelería')).toBe('crew_hoteleria');
        expect(criterionOf('Evaluación desempeño - Barman')).toBe('crew_capitan');
        expect(criterionOf('Evaluación Barman')).toBeNull();
    });
});

describe('buildCumplimiento', () => {
    const allCap = (m, a) => [
        row('Evaluación Operaciones - Capitanes', 'Ana Mar', m, a),
        row('Evaluación Administrativa - Capitanes', 'Ana Mar', m, a),
        row('Evaluación Liderazgo - Capitanes', 'Ana Mar', m, a),
    ];

    it('capitán con 5 en ambos trimestres, sin docs ni memos pendientes es apto', () => {
        const rows = [...allCap(0, '5'), ...allCap(4, '5')];
        const [p] = buildCumplimiento({ ...base, rows, staff: [cap] }).personas;
        expect(p.nota).toBe(5);
        expect(p.apto).toBe(true);
    });

    it('pondera 40/40/20 y promedia los dos trimestres', () => {
        const rows = [
            row('Evaluación Operaciones - Capitanes', 'Ana Mar', 0, '5'),
            row('Evaluación Administrativa - Capitanes', 'Ana Mar', 0, '4'),
            row('Evaluación Liderazgo - Capitanes', 'Ana Mar', 0, '5'),
            ...allCap(4, '5'),
        ];
        const [p] = buildCumplimiento({ ...base, rows, staff: [cap] }).personas;
        expect(p.trimestres[0].valor).toBe(4.6); // 0.4*5 + 0.4*4 + 0.2*5
        expect(p.nota).toBe(4.8);
        expect(p.apto).toBe(true);
    });

    it('un memo o un documento vencido descalifica aunque la nota sea 5', () => {
        const rows = [...allCap(0, '5'), ...allCap(4, '5')];
        const incidents = [{ id: 9, staffId: 1, kind: 'memo', date: '2026-02-01' }];
        const docs = [{ staffId: 1, status: 'expired', document: { name: 'Licencia' } }];
        const [p] = buildCumplimiento({ ...base, rows, staff: [cap], incidents, docs }).personas;
        expect(p.apto).toBe(false);
        expect(p.razones).toHaveLength(2);
    });

    it('criterio sin datos (hotelería) deja al tripulante no apto', () => {
        const rows = [row('Evaluación desempeño - Timoneles/Marineros', 'Luis Sol', 0, '5'), row('Evaluación desempeño - Timoneles/Marineros', 'Luis Sol', 4, '5')];
        const [p] = buildCumplimiento({ ...base, rows, staff: [marinero] }).personas;
        expect(p.rol).toBe('tripulante');
        expect(p.apto).toBe(false);
        expect(p.razones.join()).toMatch(/Hotelería/);
    });

    it('ignora evaluaciones caducadas y fuera del semestre', () => {
        const rows = [row('Evaluación Operaciones - Capitanes', 'Ana Mar', 0, '5', 'Caducada'), row('Evaluación Operaciones - Capitanes', 'Ana Mar', 8, '5')];
        expect(buildCumplimiento({ ...base, rows, staff: [cap] }).personas).toHaveLength(0);
    });
});

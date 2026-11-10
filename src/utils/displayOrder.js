const { literal } = require('sequelize');
const AppError = require('../errors/AppError');

// undefined = campo no enviado (conserva el valor), null = vaciar el orden.
const parseDisplayOrder = (value) => {
    if (value === undefined) return undefined;
    if (value === null || value === '' || value === 'null') return null;
    const order = Number(value);
    if (!Number.isInteger(order) || order < 1 || order > 9999) {
        throw new AppError('El orden debe ser un entero entre 1 y 9999', 400);
    }
    return order;
};

// Primero los que tienen orden (ascendente) y al final los que no; `alias` es el nombre del modelo/include en el SQL.
const byDisplayOrder = (alias) => [
    [literal(`\`${alias}\`.\`display_order\` IS NULL`), 'ASC'],
    [literal(`\`${alias}\`.\`display_order\``), 'ASC'],
];

module.exports = { parseDisplayOrder, byDisplayOrder };

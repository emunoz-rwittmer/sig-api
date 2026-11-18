const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

// Perfil de acceso: qué módulos y acciones puede usar quien lo tenga asignado.
const AccessProfile = db.define('access_profile', {
    id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // { "inventory.stock": ["view", "edit"], ... } — claves y acciones de accessCatalog
    permissions: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
    },
    // Bodegas permitidas en inventario. null = todas.
    warehouseIds: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'warehouse_ids',
    },
});

module.exports = AccessProfile;

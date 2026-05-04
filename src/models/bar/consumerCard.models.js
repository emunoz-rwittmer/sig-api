const db = require('../../utils/database');
const { DataTypes } = require('sequelize');

const ConsumerCard = db.define('consumer_card', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    numberCard: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    passengerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'passenger_id'
    },
    paymentType: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    totalCount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false,
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    receiptNumber: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    paidAccount: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
});

module.exports = ConsumerCard;
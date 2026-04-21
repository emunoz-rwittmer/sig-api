const ConsumerCard = require('../../models/bar/consumerCard.models');
const ConsumerCardCount = require('../../models/bar/consumerCardCount.model');
const Passenger = require('../../models/bar/passenger.models');
const Yacht = require('../../models/catalogs/yacht.models');
const ConsumerCardService = require('./consumerCard.services');
const db = require('../../utils/database');


const parseDate = (dateStr) => {
    if (!dateStr) return null;

    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

class PassengerService {

    static async sincronizePassengers(passengers, cruiseId) {
        const transaction = await db.transaction();

        try {
            const results = [];

            for (const p of passengers) {
                const identificationNumber = p.passenger_passport;

                let existingPassenger = await Passenger.findOne({
                    where: {
                        identificationNumber,
                        cruiseId
                    },
                    transaction
                });

                if (p.dates_on_board && p.dates_on_board.includes('-')) {
                    const [start, end] = p.dates_on_board.split('-');

                    startDate = parseDate(start.trim());
                    endDate = parseDate(end.trim());
                }

                if (existingPassenger) {
                    await existingPassenger.update({
                        name: p.passenger_name,
                        age: p.passenger_age,
                        agency: p.agency_name,
                        cabin: p.cabin_name,
                        type: p.cruise_type,
                        nationality: p.passenger_nationality,
                        country: p.passenger_country,
                        gender: p.passenger_gender,
                        cruiseStartDate: startDate,
                        cruiseEndDate: endDate
                    }, { transaction });

                    results.push(existingPassenger);

                } else {
                    const newPassenger = await Passenger.create({
                        cruiseId,
                        identificationNumber,
                        name: p.passenger_name,
                        age: p.passenger_age,
                        agency: p.agency_name,
                        cabin: p.cabin_name,
                        type: p.cruise_type,
                        nationality: p.passenger_nationality,
                        country: p.passenger_country,
                        gender: p.passenger_gender,
                        cruiseStartDate: startDate,
                        cruiseEndDate: endDate
                    }, { transaction });

                    let [consecutivo] = await ConsumerCardCount.findOrCreate({
                        where: {},
                        defaults: { valor: 1 },
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });

                    consecutivo = await ConsumerCardCount.findOne({
                        where: { id: consecutivo.id },
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });

                    const formattedCounter = `000-${consecutivo.valor
                        .toString()
                        .padStart(3, '0')}`;

                    await ConsumerCard.create({
                        numberCard: formattedCounter,
                        passengerId: result.id,
                    }, { transaction });

                    await consecutivo.update(
                        { valor: consecutivo.valor + 1 },
                        { transaction }
                    );

                    results.push(newPassenger);
                }
            }

            await transaction.commit();
            return results;

        } catch (error) {
            console.log(error)
            await transaction.rollback();
            throw error;
        }
    }

    static async createPassenger(data) {
        const transaction = await db.transaction();

        try {
            const result = await Passenger.create(data, { transaction });

            let [consecutivo] = await ConsumerCardCount.findOrCreate({
                where: {},
                defaults: { valor: 1 },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            consecutivo = await ConsumerCardCount.findOne({
                where: { id: consecutivo.id },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            const formattedCounter = `000-${consecutivo.valor
                .toString()
                .padStart(3, '0')}`;

            await ConsumerCard.create({
                numberCard: formattedCounter,
                passengerId: result.id,
            }, { transaction });

            await consecutivo.update(
                { valor: consecutivo.valor + 1 },
                { transaction }
            );

            await transaction.commit();
            return result;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updatePassenger(data, id) {
        try {
            const result = await Passenger.update(data, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

}

module.exports = PassengerService;
const ConsumerCard = require('../../models/bar/consumerCard.models');
const ConsumerCardItems = require('../../models/bar/consumerCardItems.models');
const Cruise = require('../../models/bar/cruises.models');
const Passenger = require('../../models/bar/passenger.models');
const ProductBar = require('../../models/bar/productBar.models');
const Yacht = require('../../models/catalogs/yacht.models');

class CruiseService {
    static async getAll() {
        try {
            const result = await Cruise.findAll({
                include: [
                    {
                        model: Yacht,
                        as: 'yacht'
                    }],
                order: [['startDate', 'DESC']]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getCruiseById(id) {
        try {
            const result = await Cruise.findOne({
                where: { id },
                include: [
                    {
                        model: Yacht,
                        as: 'yacht',
                        attributes: ['name', 'code']
                    },
                    {
                        model: Passenger,
                        as: 'passengers',
                        include: [
                            {
                                model: ConsumerCard,
                                as: 'consumer_card',
                                attributes: ['id', 'numberCard', 'totalCount', 'paidAccount', 'image', 'paymentType', 'receiptNumber'],
                                include: [
                                    {
                                        model: ConsumerCardItems,
                                        as: 'items',
                                        attributes: ['quantity', 'price', 'createdAt'],
                                        include: [{
                                            model: ProductBar,
                                            as: 'product',
                                            attributes: ['name', 'price', 'category'],
                                        }]
                                    }]
                            },
                        ]
                    },
                ]
            });

            if (!result) return null;

            const passengers = result.passengers || [];
            const cabins = Array.from({ length: 10 }, (_, i) => ({
                cabin: i + 1,
                passengers: []
            }));

            passengers.forEach(p => {
                const cabinIndex = p.cabin - 1;

                if (cabins[cabinIndex]) {
                    cabins[cabinIndex].passengers.push(p);
                }
            });

            const response = {
                ...result.toJSON(),
                cabins
            };

            return response;

        } catch (error) {
            throw error;
        }
    }

    static async updateCruise(id, data) {
        try {
            const result = await Cruise.update(data, {
                where: { id }
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

}

module.exports = CruiseService;
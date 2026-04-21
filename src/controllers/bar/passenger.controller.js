const PassengerService = require('../../services/bar/passenger.services');
const Utils = require('../../utils/Utils');
const axios = require('axios');

const sincronizePassengers = async (req, res) => {
    try {
        const cruiseId = Utils.decode(req.params.cruise_id);
        const response = await axios.get(`${process.env.URL_MICRO_SERVICE}/microservice/cruise/${cruiseId}/passenger_info`);
        const passengers = response.data || [];
        
        const result = await PassengerService.sincronizePassengers(passengers, cruiseId);
        res.status(200).json({ data: 'sincronize passengers successfully' });
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createPassenger = async (req, res) => {
    try {
        const passenger = req.body;
        passenger.cruiseId = Utils.decode(passenger.cruiseId);
        const result = await PassengerService.createPassenger(passenger);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const updatePassenger = async (req, res) => {
    try {
        const passengerId = Utils.decode(req.params.passenger_id);
        const passenger = req.body;
        await PassengerService.updatePassenger(passenger, {
            where: { id: passengerId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}


const PassengerController = {
    sincronizePassengers,
    createPassenger,
    updatePassenger,
}
module.exports = PassengerController
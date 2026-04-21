const { Router } = require('express');
const CruiseController = require('../../controllers/bar/cruise.controller');
const ProductBarController = require('../../controllers/bar/productsBar.controller');
const ConsumerCardController = require('../../controllers/bar/consumerCard.controller');
const PassengerController = require('../../controllers/bar/passenger.controller');
const { uploadSingleImage } = require('../../utils/uploadConfiguration');

const router = Router();

//cruises
router.get('/cruises', CruiseController.getAllCruises);
router.get('/cruises/:cruise_id', CruiseController.getCruise);
router.post('/cruises/createCruise', uploadSingleImage, CruiseController.createCruise);
router.put('/cruises/updateCruise/:cruise_id', uploadSingleImage, CruiseController.updateCruise);
router.delete('/cruises/:cruise_id', CruiseController.deleteCruise);

//products-bar
router.get('/products', ProductBarController.getProducts);
router.get('/products/:product_id', ProductBarController.getProduct);
router.post('/products/createProduct', ProductBarController.createProduct);
router.put('/products/updateProduct/:product_id', ProductBarController.updateProduct);
router.delete('/products/:product_id', ProductBarController.deleteProduct);

//Passenger
router.get('/passengers/:cruise_id/sincronize', PassengerController.sincronizePassengers);
router.post('/passengers/createPassenger', uploadSingleImage, PassengerController.createPassenger);
router.put('/passengers/updatePassenger/:passenger_id', uploadSingleImage, PassengerController.updatePassenger);

//consumer card
router.post('/consumer-cards/createConsumerCard', ConsumerCardController.createConsumerCard);

module.exports = router;
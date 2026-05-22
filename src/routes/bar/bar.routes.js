const { Router } = require('express');
const CruiseController = require('../../controllers/bar/cruise.controller');
const ProductBarController = require('../../controllers/bar/productsBar.controller');
const ConsumerCardController = require('../../controllers/bar/consumerCard.controller');
const PassengerController = require('../../controllers/bar/passenger.controller');
const { uploadImageFile } = require('../../utils/uploadConfiguration');

const router = Router();

//cruises
router.get('/cruises', CruiseController.getAllCruises);
router.get('/cruises/:cruise_id', CruiseController.getCruise);
router.put('/cruises/sendCruiseReport/:cruise_id', CruiseController.sendCruiseReport);
router.put('/cruises/:cruise_id', CruiseController.updateCruise);


//products-bar
router.get('/products', ProductBarController.getProducts);
router.get('/products/relationBar', ProductBarController.getProductsForBar);
router.get('/products/:product_id', ProductBarController.getProduct);
router.post('/products/createProduct', ProductBarController.createProduct);
router.put('/products/updateProduct/:product_id', ProductBarController.updateProduct);
router.delete('/products/:product_id', ProductBarController.deleteProduct);

//Passenger
router.get('/passengers/:cruise_id/sincronize', PassengerController.sincronizePassengers);
router.post('/passengers/createPassenger', PassengerController.createPassenger);
router.put('/passengers/updatePassenger/:passenger_id', PassengerController.updatePassenger);

//consumer card
router.post('/consumer-cards/createConsumerCard', ConsumerCardController.createConsumerCard);
router.put('/consumer-cards/updateConsumerCard/:card_id', uploadImageFile, ConsumerCardController.updateConsumerCard);

//cortecy card
router.post('/cortecy-cards/createCortecyCard', ConsumerCardController.createCortecyCard);
router.put('/cortecy-cards/updateCortecyCard/:card_id', uploadImageFile, ConsumerCardController.updateCortecyCard);


module.exports = router;
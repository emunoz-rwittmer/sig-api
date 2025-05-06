const { Router } = require('express');
const ComentCardController = require('../../../controllers/operations/comentCard/comentCard.controller');
const authJwt = require('../../../middlewares/auth.middleware');

const router = Router();

router.get('/', authJwt.verifyToken, ComentCardController.getAllComentCards);
router.get('/:card_id', authJwt.verifyToken, ComentCardController.getComentCard);
router.post('/createComentCard', authJwt.verifyToken, ComentCardController.createComentCard);
router.put('/updateComentCard/:card_id', authJwt.verifyToken, ComentCardController.updateComentCard);
router.delete('/:card_id', authJwt.verifyToken, ComentCardController.deleteComentCard);

module.exports = router;
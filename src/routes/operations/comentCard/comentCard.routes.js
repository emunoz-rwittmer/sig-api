const { Router } = require('express');
const ComentCardController = require('../../../controllers/operations/comentCard/comentCard.controller');
const authJwt = require('../../../middlewares/auth.middleware');

const router = Router();

router.get('/', authJwt.verifyToken, ComentCardController.getAllComentCards);
router.get('/:card_id', authJwt.verifyToken, ComentCardController.getComentCard);
router.post('/createComentCard', authJwt.verifyToken, ComentCardController.createComentCard);
router.put('/updateComentCard/:card_id', authJwt.verifyToken, ComentCardController.updateComentCard);
router.delete('/:card_id', authJwt.verifyToken, ComentCardController.deleteComentCard);

//COMMENTCARD YACHT
router.get('/cards_yachts/yachts', authJwt.verifyToken, ComentCardController.getYachtsWithComentCard);
router.get('/access_links/relation/:card_yacht_id', ComentCardController.getAllAccessLinks);
router.post('/createCardYacht/:card_id', authJwt.verifyToken, ComentCardController.createCardYacht);
router.delete('/delete_card_yacht/:card_id', authJwt.verifyToken, ComentCardController.deleteCardYacht);
//LINK COMENTCARD
router.post('/createLink/CardYacht', authJwt.verifyToken, ComentCardController.createLink);


//PUBLIC ACCESS LINK
router.get('/coment_card/:yacht_id', ComentCardController.getComentCardByYacht);


module.exports = router;
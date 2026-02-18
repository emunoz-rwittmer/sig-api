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
router.get('/:card_id/cards_yachts/yachts', authJwt.verifyToken, ComentCardController.getYachtsWithComentCard);
router.get('/access_links/relation/:card_yacht_id', ComentCardController.getAllAccessLinks);
router.get('/coment_cards_link/:link_id', ComentCardController.getAllComentCardsForLink);

//PUBLIC ACCESS LINK
router.get('/coment_card_by_yacht/dates/:yacht_id', ComentCardController.getComentCardByDates);
router.get('/coment_card_by_qr/:comet_card_qr', ComentCardController.getComentCardByQr);
router.post('/respond_coment_card/:comet_card_qr', ComentCardController.respondComentCard);

//REPORTS
router.get('/reports/:yacht_id', ComentCardController.getReportingByYacht);
module.exports = router;
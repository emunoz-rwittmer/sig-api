const { Router } = require('express');
const ShippingGuideController  = require ('../../../controllers/operations/shippingGuide/shippingGuide.controller');

const router = Router();

router.get('/',ShippingGuideController.getShippingGuides);
router.get('/:guide_id',ShippingGuideController.getShippingGuideById);
router.post('/',  ShippingGuideController.createShippingGuide);
router.put('/:guide_id', ShippingGuideController.updateShippingGuide);
//router.delete('/:guide_id', ShippingGuideController.deleteShippingGuide);

module.exports = router;
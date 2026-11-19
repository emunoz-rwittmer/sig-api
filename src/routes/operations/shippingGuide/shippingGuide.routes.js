const { Router } = require('express');
const ShippingGuideController  = require ('../../../controllers/operations/shippingGuide/shippingGuide.controller');

const { requireAccess } = require('../../../middlewares/access.middleware');

const GUIDES = 'inventory.guides';

const router = Router();

router.use(requireAccess([[GUIDES, 'view']]));

router.get('/',ShippingGuideController.getShippingGuides);
router.get('/:guide_id',ShippingGuideController.getShippingGuideById);
router.post('/', requireAccess([[GUIDES, 'edit']]), ShippingGuideController.createShippingGuide);
router.put('/:guide_id', requireAccess([[GUIDES, 'edit']]), ShippingGuideController.updateShippingGuide);
router.delete('/:guide_id', requireAccess([[GUIDES, 'delete']]), ShippingGuideController.deleteShippingGuide);

module.exports = router;
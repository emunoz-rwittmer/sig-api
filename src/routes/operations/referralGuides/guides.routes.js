const { Router } = require('express');
const GuideController  = require ('../../../controllers/operations/referralGuides/guides.controller');

const router = Router();

router.get('/:company_id/all',GuideController.getGuidesByCompany);
router.get('/:guide_id',GuideController.getGuideById);
router.post('/:company_id',  GuideController.createGuide);
//router.put('/:guide_id', GuideController.updateStatusGuide);

module.exports = router;
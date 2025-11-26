const { Router } = require('express');
const CrewBoardingController = require('../../../controllers/operations/surveys/crewBoarding.controller');

const router = Router();

router.get('/allYachts', CrewBoardingController.getAllYachts);
router.get('/:yacht_id/allCrew', CrewBoardingController.getYachtWithAllCrew);
//dates
router.get('/:staff_company_id/allDatesBoardingStaff', CrewBoardingController.getAllDatesBoardingStaff);
router.post('/', CrewBoardingController.createDates);
router.put('/:date_id', CrewBoardingController.updateDate);
router.delete('/:date_id',CrewBoardingController.deleteDate);


module.exports = router;
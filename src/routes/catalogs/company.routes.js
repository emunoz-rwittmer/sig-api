const { Router } = require('express');
const CompanyController = require('../../controllers/catalogs/company.controller');
const { uploadSingleImage } = require('../../utils/uploadConfiguration');

const router = Router();

router.get('/', CompanyController.getAllCompanys);
router.get('/:company_id', CompanyController.getCompany);
router.post('/createCompany', uploadSingleImage, CompanyController.createCompany);
router.put('/updateCompany/:company_id', uploadSingleImage, CompanyController.updateCompany);
router.delete('/:company_id', CompanyController.deleteCompany);


module.exports = router;
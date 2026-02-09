const { Router } = require('express');
const DocumentsController  = require ('../../controllers/catalogs/documentation.controller');

const router = Router();

router.get('/', DocumentsController.getDocuments);
router.get('/:document_id',DocumentsController.getDocument);
router.post('/createDocument',DocumentsController.createDocument);
router.put('/updateDocument/:document_id',DocumentsController.updateDocument);
router.delete('/:document_id',DocumentsController.deleteDocument);


module.exports = router;
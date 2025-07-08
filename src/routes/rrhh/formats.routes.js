const { Router } = require('express');
const FormatController = require('../../controllers/rrhh/formats.controller');
const router = Router();

//request
router.get('/request', FormatController.getAllFormats);
router.get('/request/:format_id', FormatController.getFormat);
router.post('/request', FormatController.createFormat);
router.put('/request/:format_id', FormatController.updateFormat);
router.delete('/request/:format_id', FormatController.deleteFormat);

//docs
// router.get('/', FormatController.getAllFormats);
// router.get('/:format_id', FormatController.getFormat);
// router.post('/', FormatController.createFormat);
// router.put('/:format_id', FormatController.updateFormat);
// router.delete('/:format_id', FormatController.deleteFormat);



module.exports = router;
const { Router } = require('express');
const ProcesController  = require ('../../../controllers/operations/indicators/proces.controller');

const router = Router();

router.get('/',ProcesController.getAllProcess);
router.get('/:proces_id',ProcesController.getProces);
router.post('/',ProcesController.createProces);
router.put('/:proces_id',ProcesController.updateProces);
router.delete('/:proces_id',ProcesController.deleteProces);


module.exports = router;
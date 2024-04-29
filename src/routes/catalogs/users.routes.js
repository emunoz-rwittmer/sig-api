const { Router } = require('express');
const UserController  = require ('../../controllers/catalogs/users.controller');

const router = Router();

router.get('/',UserController.getAllUsers);
router.get('/:user_id',UserController.getUser);
router.post('/createUser',UserController.createUser);
router.put('/updateUser/:user_id',UserController.updateUser);
router.get('/:user_id/changePassword',UserController.changePassword);
router.delete('/:user_id',UserController.deleteUser);


module.exports = router;
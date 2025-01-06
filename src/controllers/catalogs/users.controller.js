const UserService = require('../../services/catalogs/users.services');
const Utils = require('../../utils/Utils');
const { sendEmail } = require('../../utils/mailer');
const bcrypt = require("bcrypt");

const getAllUsers = async (req, res) => {
    try {
        const result = await UserService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getUser = async (req, res) => {
    try {
        const userId = Utils.decode(req.params.user_id);
        const result = await UserService.getUserById(userId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
            result.role_id = Utils.encode(result.role_id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createUser = async (req, res) => {
    try {
        const user = req.body;
        const passwordGenerate = Utils.getPasswordRandom();
        user.password = passwordGenerate
        user.roleId = Utils.decode(user.roleId)
        const action = "new user"
        const result = await UserService.createUser(user);
        if (result) {
            sendEmail(result, passwordGenerate, action);
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}



const updateUser = async (req, res) => {
    try {
        const userId = Utils.decode(req.params.user_id);
        const user = req.body;
        user.roleId = Utils.decode(req.body.roleId);
        const result = await UserService.updateUser(user, {
            where: { id: userId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteUser = async (req, res) => {
    try {
        const userId = Utils.decode(req.params.user_id);
        const result = await UserService.delete({
            where: { id: userId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {

        res.status(400).json(error.message);
    }
}

const UserController = {
    getAllUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser
}
module.exports = UserController
const UserService = require('../../services/catalogs/users.services');
const Utils = require('../../utils/Utils');
const Tokens = require('../../utils/tokens');
const { sendEmail } = require('../../mails/mailer');
const bcrypt = require("bcrypt");

const getAllUsers = async (req, res, next) => {
    try {
        const result = await UserService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.roleId = Utils.encode(x.dataValues.roleId);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getUser = async (req, res, next) => {
    try {
        const userId = Utils.decode(req.params.user_id);
        const result = await UserService.getUserById(userId);
        if (result instanceof Object) {
            result.dataValues.id = Utils.encode(result.id);
            result.roleId = Utils.encode(result.roleId);
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createUser = async (req, res, next) => {
    try {
        const user = req.body;
        const passwordGenerate = Tokens.getPasswordRandom();
        user.password = passwordGenerate
        user.roleId = Utils.decode(user.roleId)
        const action = "new user"
        const result = await UserService.createUser(user);
        sendEmail(result, passwordGenerate, action);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
}



const updateUser = async (req, res, next) => {
    try {
        const userId = Utils.decode(req.params.user_id);
        const user = req.body;
        delete user.id
        user.roleId = Utils.decode(req.body.roleId);
        await UserService.updateUser(user, {
            where: { id: userId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteUser = async (req, res, next) => {
    try {
        const userId = Utils.decode(req.params.user_id);
        const result = await UserService.delete({
            where: { id: userId }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        next(error);
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

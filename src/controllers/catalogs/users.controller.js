const UserService = require('../../services/catalogs/users.services');
const Utils = require('../../utils/Utils');
const sendEmail = require('../../utils/mailer');
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
            sendEmail(result, passwordGenerate, action );
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
        console.log(error)
        res.status(400).json(error.message);
    }
}

const changePassword = async (req, res) => {
    try {
        const userId = Utils.decode(req.params.user_id);
        const passwordGenerate = Utils.getPasswordRandom();
        const hash = bcrypt.hashSync(passwordGenerate, 10);
        const result = await UserService.changePassword(hash, { where: { id: userId } });
        if (result) {
            res.status(201).json({ message: 'password change successfully' });
            const user = await UserService.getUserById(userId);
            const userRegistrationEmail = {
                from: 'Millionaire Flyer',
                to: user.email,
                subject: 'Email confirmation',
                html: `<h1>Su password ha sido restablecido</h1>
                   <h3>Estimado/a ${user.dataValues.first_name} ${user.dataValues.last_name},</h3>
                   <p>Se ha restablecido su contraseña a: ${passwordGenerate}</p>
                   <p>por favor ingrese al siguiente link <a href="http://127.0.0.1:5173/login">voladora_millonaria.com</a>, use su nueva contraseña</p>
            
                   <h3>Atentamente</h3>
                   <h3>Equipo Millionaire Flyer</h3>`,
            };
            transporter.sendMail(userRegistrationEmail, (error, info) => {
                if (error) {
                    console.error('Error al enviar el correo electrónico:', error);
                } else {
                    console.log('Correo electrónico de notificación enviado:', info.response);
                }
            });
        } else {
            res.status(400).json({ message: 'something wrong' });
        }
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
        console.log(error)
        res.status(400).json(error.message);
    }
}

const UserController = {
    getAllUsers,
    getUser,
    createUser,
    updateUser,
    changePassword,
    deleteUser
}
module.exports = UserController
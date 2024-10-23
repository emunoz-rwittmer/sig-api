const AuthService = require('../../services/catalogs/auth.services');
const UserService = require('../../services/catalogs/users.services');
const Utils = require('../../utils/Utils');
const tokenModel = require('../../models/mongoModels/Token.models');
const bcrypt = require('bcrypt');
const sendEmail = require('../../utils/mailer');
const Staffervice = require('../../services/catalogs/staff.services');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email) {
            res.status(400).json({ data: 'Not email provided' });
        }
        if (!password) {
            res.status(400).json({ data: 'Not password provided' });
        }
        const result = await AuthService.login({ email, password });
        if (result.isValid) {
            if (result.user.active) {
                const { id, firstName, lastName, email } = result.user;
                const userData = { id, firstName, lastName, email };
                userData.id = Utils.encode(userData.id);
                userData.rol = result.user.user_rol?.name;
                const token = await Utils.generateAccessToken(userData);
                const refreshToken = await Utils.generateRefreshToken(userData);
                userData.token = token;
                userData.changePassword = result.user.changePassword
                const newToken = new tokenModel({
                    user: firstName + " " + lastName,
                    userId: Utils.encode(id),
                    accessToken: token,
                    refreshtoken: refreshToken
                });
                newToken.save();
                res.status(200).json(userData);
            } else {
                res.status(400).json({ data: 'disabled user' })
            }
        } else {
            res.status(400).json({ data: 'user or password incorrect' })
        }
    } catch (error) {
        res.status(400).json({ data: 'somethign wrong' })
    }
}

const loginUsers = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email) {
            res.status(400).json({ data: 'Not email provided' });
        }
        if (!password) {
            res.status(400).json({ data: 'Not password provided' });
        }
        const result = await AuthService.loginUsers({ email, password });
        if (result.isValid) {
            if (result.user.active) {
                const { id, firstName, lastName, email } = result.user;
                const userData = { id, firstName, lastName, email };
                userData.id = Utils.encode(userData.id);
                userData.rol = result.user.rol.name
                const token = await Utils.generateAccessToken(userData);
                const refreshToken = await Utils.generateRefreshToken(userData);
                userData.token = token;
                userData.changePassword = result.user.changePassword
                const newToken = new tokenModel({
                    user: firstName + " " + lastName,
                    userId: Utils.encode(id),
                    accessToken: token,
                    refreshtoken: refreshToken
                });
                newToken.save();
                res.status(200).json(userData);
            } else {
                res.status(400).json({ data: 'disabled user' })
            }
        } else {
            res.status(400).json({ data: 'user or password incorrect' })
        }
    } catch (error) {
        console.log(error)
        res.status(400).json({ data: 'somethign wrong' })
    }
}

const upgradePassword = async (req, res) => {
    try {
        const userId = Utils.decode(req.params.user_id);
        const userEmail = req.body.email;
        const data = {
            id: userId,
            password: bcrypt.hashSync(req.body.password, 10),
            changePassword: false
        };
        const user = await UserService.getUserByEmail(userEmail);

        if (user) {
            await AuthService.userUpgradePassword(data);
        } else {
            await AuthService.staffUpgradePassword(data);
        }

        return res.status(200).json({ data: 'password updated successfully' });
        
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const forgotPassword = async (req, res) => {
    try {
        const useEmail = req.body.email;
        const passwordGenerate = Utils.getPasswordRandom();
        const result = await UserService.getUserByEmail(useEmail);
        const staff = await Staffervice.getStaffByEmail(useEmail);
        const passwordGenerated = bcrypt.hashSync(passwordGenerate, 10);
        const action = "forgot passowrd"
        if (result) {
            sendEmail(result, passwordGenerate, action);
            const userResponse = await UserService.updateUser({
                password: passwordGenerated, changePassword: true
            },
                { where: { id: result.id } });
            if (userResponse instanceof Object) {
                return res.status(200).json({ data: "password updated successfully" });
            } else {
                return res.status(500).json({ data: userResponse });
            }
        }
        if (staff) {
            sendEmail(staff, passwordGenerate, action);
            const respose = await Staffervice.updateStaff(
                {
                    password: passwordGenerated, changePassword: true
                }, { where: { id: staff.id } });

            if (respose instanceof Object) {
                return res.status(200).json({ data: "password updated successfully" });
            } else {
                return res.status(500).json({ data: respose });
            }
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}


const AuthController = {
    login,
    loginUsers,
    upgradePassword,
    forgotPassword
}

module.exports = AuthController 
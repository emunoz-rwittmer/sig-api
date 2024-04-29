const AuthService = require('../../services/catalogs/auth.services');
const UserService = require('../../services/catalogs/users.services');
const Utils = require('../../utils/Utils');
const tokenModel = require('../../models/mongoModels/Token.models');
const EvaluationService = require('../../services/operations/evaluations/evaluations.services')
const bcrypt = require('bcrypt');
const sendEmail = require('../../utils/mailer');



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
                const token = await Utils.generateAccessToken(userData);
                const refreshToken = await Utils.generateRefreshToken(userData);
                userData.token = token;
                userData.rol = result.user.user_rol?.name;
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

const loginCaptains = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email) {
            res.status(400).json({ data: 'Not email provided' });
        }
        if (!password) {
            res.status(400).json({ data: 'Not password provided' });
        }
        const result = await AuthService.loginCaptains({ email, password });
        if (result.isValid) {
            if (result.user.active) {
                const { id, firstName, lastName, email } = result.user;
                const userData = { id, firstName, lastName, email };
                userData.id = Utils.encode(userData.id);
                const token = await Utils.generateAccessToken(userData);
                const refreshToken = await Utils.generateRefreshToken(userData);
                userData.token = token;
                userData.rol = "captain";
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

const loginCrews = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            res.status(400).json({ data: 'Not password provided' });
        }
        const result = await AuthService.loginCrews(password);
        if (result) {
            if (result.active) {
                const { id, firstName, lastName, email } = result;
                const userData = { id, firstName, lastName, email };
                userData.id = Utils.encode(userData.id);
                const token = await Utils.generateAccessToken(userData);
                const refreshToken = await Utils.generateRefreshToken(userData);
                userData.token = token;
                userData.rol = "crew";
                const getEvaluation = await EvaluationService.getEvaluationByCrew(firstName + " " + lastName)
                if (getEvaluation) {
                    userData.formId = Utils.encode(getEvaluation.formId)
                    userData.evaluationId = Utils.encode(getEvaluation.id)
                    const newToken = new tokenModel({
                        user: firstName + " " + lastName,
                        userId: Utils.encode(id),
                        accessToken: token,
                        refreshtoken: refreshToken
                    });
                    newToken.save();
                    res.status(200).json(userData);
                } else {
                    res.status(400).json({ data: 'no reviews available' })
                }
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
        const user = {
            id: userId,
            password: bcrypt.hashSync(req.body.password, 10),
            changePassword: false
        };
        const result = await AuthService.upgradePassword(user);
        res.status(200).json({ data: 'password updated successfully' });
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
        if (result) {
            const passwordGenerated = bcrypt.hashSync(passwordGenerate, 10);
            const action = "forgot passowrd"
            sendEmail(result, passwordGenerate, action);
            const userResponse = await UserService.updateUser({
                password: passwordGenerated, changePassword: true
            },
                { where: { id: result.id } });
            if (userResponse instanceof Object) {
                res.status(200).json({ data: "password updated successfully" });
            } else {
                res.status(500).json({ data: userResponse });
            }

        } else {
            res.status(400).json({ message: 'something wrong' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}


const AuthController = {
    login,
    loginCaptains,
    loginCrews,
    upgradePassword,
    forgotPassword
}

module.exports = AuthController 
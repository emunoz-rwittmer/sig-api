const AuthService = require('../../services/catalogs/auth.services');
const UserService = require('../../services/catalogs/users.services');
const Utils = require('../../utils/Utils');
const Tokens = require('../../utils/tokens');
const tokenModel = require('../../models/mongoModels/Token.models');
const bcrypt = require('bcrypt');
const { sendEmail, sendEmailPasswordStaff } = require('../../mails/mailer');
const Staffervice = require('../../services/catalogs/staff.services');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email) {
            throw new Error('Not email provided');
        }

        if (!password) {
            throw new Error('Not password provided');
        }

        const result = await AuthService.login({ email, password });

        if (!result.isValid) {
            throw new Error('Usuario o contraseña incorrectas');
        }

        if (!result.user.active) {
            throw new Error('Usuario deshabilitado');
        }

        const { id, firstName, lastName } = result.user;
        const sessioId = Tokens.getSessionRandom();
        const userData = { id, firstName, lastName };

        userData.id = Utils.encode(userData.id);
        userData.rol = result.user.user_rol?.name;
        userData.sessionId = sessioId;

        const token = await Tokens.generateAccessToken(userData);
        const refreshToken = await Tokens.generateRefreshToken(userData);

        userData.token = token;
        userData.changePassword = result.user.changePassword

        const newToken = new tokenModel({
            user: firstName + " " + lastName,
            userId: Utils.encode(id),
            sessionId: sessioId,
            refreshtoken: refreshToken
        });
        newToken.save();
        res.status(200).json(userData);

    } catch (error) {
         res.status(400).json(error.message)
    }
}

const upgradePassword = async (req, res) => {
    try {
        const userId = Utils.decode(req.params.user_id);
        const data = {
            id: userId,
            password: bcrypt.hashSync(req.body.password, 10),
            changePassword: false
        };

        await AuthService.userUpgradePassword(data);

        res.status(200).json({ data: 'password updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const forgotPassword = async (req, res) => {
    try {
        const useEmail = req.body.email;
        const passwordGenerate = Tokens.getPasswordRandom();
        const result = await UserService.getUserByEmail(useEmail);
        const passwordGenerated = bcrypt.hashSync(passwordGenerate, 10);
        const action = "forgot passowrd"
        if (result) {
            sendEmail(result, passwordGenerate, action);
            await UserService.updateUser({
                password: passwordGenerated, changePassword: true
            },
                { where: { id: result.id } }
            );

            res.status(200).json({ data: "password updated successfully" });
        }
    } catch (error) {

        res.status(400).json(error.message);
    }
}

const loginStaffs = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email) {
            res.status(400).json({ data: 'Not email provided' });
        }
        if (!password) {
            res.status(400).json({ data: 'Not password provided' });
        }
        const result = await AuthService.loginStaffs({ email, password });

        if (!result.isValid) {
            throw new Error('Usuario o contraseña incorrectas');
        }

        if (!result.user.active) {
            throw new Error('Usuario deshabilitado');
        }

        const { id, firstName, lastName } = result.user;
        const userData = { id, firstName, lastName };
        userData.id = Utils.encode(userData.id);
        userData.rol = result.user.rol?.name

        const sessioId = Tokens.getSessionRandom();
        const token = await Tokens.generateAccessToken(userData);
        const refreshToken = await Tokens.generateRefreshToken(userData);

        userData.token = token;
        userData.changePassword = result.user.changePassword
        userData.isTiptop = result.user.companies.some(x => x.companyId === 5); //es tiptop
        userData.companiIds = result.user.companies.map(company => (company.companyId = Utils.encode(company.companyId)));

        const newToken = new tokenModel({
            user: firstName + " " + lastName,
            userId: Utils.encode(id),
            sessionId: sessioId,
            refreshtoken: refreshToken
        });
        newToken.save();
        res.status(200).json(userData);

    } catch (error) {
        res.status(400).json(error.message)
    }
}

const forgotPasswordStaff = async (req, res) => {
    try {
        const useEmail = req.body.email;
        const passwordGenerate = Tokens.getPasswordRandom();
        const staff = await Staffervice.getStaffByEmail(useEmail);
        const passwordGenerated = bcrypt.hashSync(passwordGenerate, 10);

        if (staff) {
            sendEmailPasswordStaff(staff, passwordGenerate);
            const data = {
                id: staff.id,
                password: passwordGenerated,
                changePassword: true
            };
            await AuthService.staffUpgradePassword(data);
            res.status(200).json({ data: "password updated successfully" });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}


const upgradePasswordStaff = async (req, res) => {
    try {
        const userId = Utils.decode(req.params.staff_id);
        const data = {
            id: userId,
            password: bcrypt.hashSync(req.body.password, 10),
            changePassword: false
        };

        await AuthService.staffUpgradePassword(data);

        res.status(200).json({ data: 'password updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}


const AuthController = {
    login,
    upgradePassword,
    forgotPassword,
    loginStaffs,
    forgotPasswordStaff,
    upgradePasswordStaff
}

module.exports = AuthController 
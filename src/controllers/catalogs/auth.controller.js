const AuthService = require('../../services/catalogs/auth.services');
const UserService = require('../../services/catalogs/users.services');
const Utils = require('../../utils/Utils');
const Tokens = require('../../utils/tokens');
const tokenModel = require('../../models/mongoModels/Token.models');
const bcrypt = require('bcrypt');
const { sendEmail, sendEmailPasswordStaff } = require('../../mails/mailer');
const Staffervice = require('../../services/catalogs/staff.services');
const AppError = require('../../errors/AppError');

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email) {
            throw new AppError('Not email provided', 400);
        }

        if (!password) {
            throw new AppError('Not password provided', 400);
        }

        const result = await AuthService.login({ email, password });

        if (!result.isValid) {
            throw new AppError('Usuario o contraseña incorrectas', 401);
        }

        if (!result.user.active) {
            throw new AppError('Usuario deshabilitado', 403);
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
        await newToken.save();
        res.status(200).json(userData);

    } catch (error) {
        next(error);
    }
}

const upgradePassword = async (req, res, next) => {
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
        next(error);
    }
}

const forgotPassword = async (req, res, next) => {
    try {
        const useEmail = req.body.email;
        const passwordGenerate = Tokens.getPasswordRandom();
        const result = await UserService.getUserByEmail(useEmail);

        if (!result) {
            throw new AppError('Usuario no encontrado', 404);
        }

        const passwordGenerated = bcrypt.hashSync(passwordGenerate, 10);
        const action = "forgot passowrd"
        sendEmail(result, passwordGenerate, action);
        await UserService.updateUser({
            password: passwordGenerated, changePassword: true
        },
            { where: { id: result.id } }
        );

        res.status(200).json({ data: "password updated successfully" });
    } catch (error) {
        next(error);
    }
}

const loginStaffs = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email) {
            throw new AppError('Not email provided', 400);
        }
        if (!password) {
            throw new AppError('Not password provided', 400);
        }
        const result = await AuthService.loginStaffs({ email, password });

        if (!result.isValid) {
            throw new AppError('Usuario o contraseña incorrectas', 401);
        }

        if (!result.user.active) {
            throw new AppError('Usuario deshabilitado', 403);
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
        await newToken.save();
        res.status(200).json(userData);

    } catch (error) {
        next(error);
    }
}

const forgotPasswordStaff = async (req, res, next) => {
    try {
        const useEmail = req.body.email;
        const passwordGenerate = Tokens.getPasswordRandom();
        const staff = await Staffervice.getStaffByEmail(useEmail);

        if (!staff) {
            throw new AppError('Usuario no encontrado', 404);
        }

        const passwordGenerated = bcrypt.hashSync(passwordGenerate, 10);
        sendEmailPasswordStaff(staff, passwordGenerate);
        const data = {
            id: staff.id,
            password: passwordGenerated,
            changePassword: true
        };
        await AuthService.staffUpgradePassword(data);
        res.status(200).json({ data: "password updated successfully" });
    } catch (error) {
        next(error);
    }
}


const upgradePasswordStaff = async (req, res, next) => {
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
        next(error);
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
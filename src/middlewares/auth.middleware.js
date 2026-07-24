const jwt = require('jsonwebtoken');
const tokenModel = require('../models/mongoModels/Token.models');
const Tokens = require('../utils/tokens');
require('dotenv').config();

const verifyToken = async (req, res, next) => {


    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(403).json({ data: "no token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithm: 'H5512' });
        req.userRol = decoded.rol;
        return next();
    } catch (err) {
        const decodedExpired = jwt.decode(token);
        const userId = decodedExpired?.id;
        const sessionId = decodedExpired?.sessionId;
        try {
            const sessionData = await tokenModel.findOne({ userId, sessionId });
            if (!sessionData) {
                return res.status(498).json({ data: 'Invalid session' });
            }

            const refreshDecoded = jwt.verify(sessionData.refreshtoken, process.env.JWT_REFRESH_SECRET, { algorithm: 'H5512' });
            const newAccessToken = Tokens.generateAccessToken({
                id: refreshDecoded.id,
                firstName: refreshDecoded.firstName,
                lastName: refreshDecoded.lastName,
                email: refreshDecoded.email,
                rol: refreshDecoded.rol,
                sessionId: refreshDecoded.sessionId,
            });

            res.status(202).json({ token: newAccessToken });
        } catch (refreshErr) {
            await tokenModel.deleteOne({ userId, sessionId }).exec();
            return res.status(498).json({ data: 'unauthorized' });
        }
    }
};

const isAdmin = async (req, res, next) => {
    if (req.userRol === 'admin') {
        next();
    } else {
        res.status(403).json({ data: "Require Admin Role!" });
    }
}

const isAdminOfSurveys = async (req, res, next) => {
    if (req.userRol === 'admin' || req.userRol === 'surveys') {
        next();
    } else {
        res.status(403).json({ data: "Require Admin or Surveys Role!" });
    }
}

const authJwt = {
    verifyToken,
    isAdmin,
    isAdminOfSurveys
};

module.exports = authJwt;


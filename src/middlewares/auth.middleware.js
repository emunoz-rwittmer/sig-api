const jwt = require('jsonwebtoken');
const tokenModel = require('../models/mongoModels/Token.models');
const auth = require("../utils/auth");
const Utils = require('../utils/Utils');
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
        const userId = decodedExpired?.user_id;
        const sessionId = decodedExpired?.sessionId;

        try {
            const sessionData = await tokenModel.findOne({ userId, sessionId });

            if (!sessionData) {
                return res.send({ code: 498, data: "Invalid session" });
            }

            const refreshDecoded = jwt.verify(String(sessionData.refreshtoken), process.env.JWT_REFRESH_SECRET);
            const newAccessToken = Utils.generateAccessToken({
                user_id: refreshDecoded.user_id,
                user_name: refreshDecoded.user_name,
                sessionId: refreshDecoded.sessionId,
            });
            res.status(202).json({ token: newAccessToken.accessToken });
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


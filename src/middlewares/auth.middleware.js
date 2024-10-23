const jwt = require('jsonwebtoken');
const tokenModel = require('../models/mongoModels/Token.models');
const auth = require("../utils/auth");
const Utils = require('../utils/Utils');
const UserService = require('../services/catalogs/users.services');
require('dotenv').config();


const verifyToken = async (req, res, next) => {

    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, { algorithm: 'H5512' }, (err, decoded) => {
            if (err) {
                const sessionData = auth.fetchSessionData(token);
                sessionData.then(response => {
                    jwt.verify(String(response.refreshtoken), process.env.JWT_REFRESH_SECRET, function (err, decoded) {
                        if (err) {
                            tokenModel.deleteOne({ accessToken: token }).exec();
                            return res.status(498).json({ data: 'unauthorized' });
                        } else {
                            const newAccessToken = { accessToken: Utils.generateAccessToken({ id: response.userId, user_name: response.user }) };
                            tokenModel.findOneAndUpdate({ accessToken: token }, newAccessToken).exec();
                            res.status(202).json({ token: newAccessToken.accessToken });
                        }
                    });
                }).catch(error => {
                    console.log("error al renovar :" + error.name)
                });
            } else {
                req.userRol = decoded.rol;
                next();
            }
        }
        );

    } else {
        return res.status(403).json({ data: "no token provided" });
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


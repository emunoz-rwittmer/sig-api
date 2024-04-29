const tokenModel = require('../models/mongoModels/Token.models');

async function fetchSessionData(token) {
    try {
        const sessionData = await tokenModel.findOne({ accessToken: token });
        return sessionData;
    } catch (error) {
        return error;
    }
};

const auth = {
    fetchSessionData,
};

module.exports = auth 
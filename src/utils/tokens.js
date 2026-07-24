const jwt = require('jsonwebtoken');

function getPasswordRandom() {
    const characters = "ABCDEFGHJKMNOPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz!%?+{}1234567890";
    const length = 6;
    let randomString = "";

    for (let i = 0; i < length; i++) {
        const randomNum = Math.floor(Math.random() * characters.length);
        randomString += characters[randomNum];
    }
    return randomString;
}

function generateAccessToken(data) {
    const token = jwt.sign(data, process.env.JWT_SECRET, {
        expiresIn: "10h",
        algorithm: "HS512",
    });
    return token;
}

function generateRefreshToken(data) {
    const token = jwt.sign(data, process.env.JWT_REFRESH_SECRET, {
        expiresIn: "10h",
        algorithm: "HS512",
    });
    return token;
}

function getSessionRandom() {
    const characters = "ABCDEFGHJKMNOPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz!%?+{}1234567890";
    const length = 6;
    let randomString = "";

    for (let i = 0; i < length; i++) {
        const randomNum = Math.floor(Math.random() * characters.length);
        randomString += characters[randomNum];
    }
    return randomString;
}

module.exports = { getPasswordRandom, generateAccessToken, generateRefreshToken, getSessionRandom };

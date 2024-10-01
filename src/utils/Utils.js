const Hashids = require('hashids/cjs')
const salt = "tiptop-hlfe/r0lf";
const jwt = require('jsonwebtoken');
const numberKeys = 10;

class Utils {
  static encode(text) {
    const hashids = new Hashids(salt, numberKeys);
    const id = hashids.encode(text);
    return id;
  }

  static decode(text) {
    const hashids = new Hashids(salt, numberKeys);
    const id = hashids.decode(text);
    return id[0];
  }

  static getPasswordRandom() {
    const characters = "ABCDEFGHJKMNOPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz!%?+{}1234567890";
    const length = 6;
    let randomString = "";

    for (let i = 0; i < length; i++) {
      const randomNum = Math.floor(Math.random() * characters.length);
      randomString += characters[randomNum];
    }
    return randomString;
  }

  static generateAccessToken(data) {
    const token = jwt.sign(data, process.env.JWT_SECRET, {
      expiresIn: "55m",
      algorithm: "HS512",
  });
  return token;
  }

  static generateRefreshToken(data) {
    const token = jwt.sign(data, process.env.JWT_REFRESH_SECRET, {
      expiresIn: "10h", 
      algorithm: "HS512", 
  });
  return token;
  }

  static formatDateToLocal (date) {
    const formattedDate = new Date(date);
    const day = formattedDate.getDate();
    const month = formattedDate.getMonth() + 1; // Los meses empiezan desde 0
    const year = formattedDate.getFullYear();
    return `${day}/${month}/${year}`;
}

}
module.exports = Utils;
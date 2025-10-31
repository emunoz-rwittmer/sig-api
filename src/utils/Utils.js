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
      expiresIn: "10h",
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

  static getSessionRandom() {
    const characters = "ABCDEFGHJKMNOPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz!%?+{}1234567890";
    const length = 6;
    let randomString = "";

    for (let i = 0; i < length; i++) {
      const randomNum = Math.floor(Math.random() * characters.length);
      randomString += characters[randomNum];
    }
    return randomString;
  }

  static formatDateToLocal(date) {
    const formattedDate = new Date(date);
    const day = formattedDate.getDate();
    const month = formattedDate.getMonth() + 1; // Los meses empiezan desde 0
    const year = formattedDate.getFullYear();
    return `${day}/${month}/${year}`;
  }

  static formatMonthYear(dateValue) {
    if (!dateValue) return '';

    const value = String(dateValue);
    const datePart = value.split(' ')[0]?.split('T')[0];
    if (!datePart) return '';

    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return '';

    const d = new Date(year, month - 1, day);
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const monthStr = monthNames[d.getMonth()];
    const yearStr = d.getFullYear();

    return `${dayStr} de ${monthStr} del ${yearStr}`;
  }

  static asignarPuntaje(respuesta) {
    const matchParentesis = respuesta.match(/\((\d+)\)/);
    if (matchParentesis) {
      return Number(matchParentesis[1]);
    }

    const matchAntesParentesis = respuesta.match(/(\d+)\s*\(/);
    if (matchAntesParentesis) {
      return Number(matchAntesParentesis[1]);
    }

    const puntajes = {
      5: ['Casi siempre', 'Excelente'],
      4: ['Con frecuencia', 'Muy bueno', 'Muy Bueno'],
      3: ['Mas o menos', 'Bueno'],
      2: ['A veces', 'Regular'],
      1: ['Casi nunca', 'Ineficiente']
    };

    for (const [puntos, respuestas] of Object.entries(puntajes)) {
      if (respuestas.includes(respuesta)) {
        return Number(puntos);
      }
    }

    // Si no coincide con nada, devuelve 0
    return 0;
  }

}
module.exports = Utils;
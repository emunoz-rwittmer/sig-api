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
    if (!respuesta || typeof respuesta !== 'string') return null;

    const texto = respuesta.trim();

    // 1️⃣ Número antes del paréntesis: "Siempre 5 (algo)"
    const numeroAntesParentesis = texto.match(/(\d+)\s*\(/);
    if (numeroAntesParentesis) {
      return Number(numeroAntesParentesis[1]);
    }

    // 2️⃣ Número dentro del paréntesis: "Siempre (5)"
    const numeroEnParentesis = texto.match(/\((\d+)\)/);
    if (numeroEnParentesis) {
      return Number(numeroEnParentesis[1]);
    }

    // 3️⃣ Cualquier número suelto
    const numeroGeneral = texto.match(/\b\d+\b/);
    if (numeroGeneral) {
      return Number(numeroGeneral[0]);
    }

    // 4️⃣ Mapeo tradicional
    const puntajes = {
      5: ['Casi siempre', 'Excelente', 'Siempre'],
      4: ['Con frecuencia', 'Muy bueno', 'Muy Bueno'],
      3: ['Mas o menos', 'Bueno'],
      2: ['A veces', 'Regular'],
      1: ['Casi nunca', 'Ineficiente']
    };

    for (const [puntos, respuestas] of Object.entries(puntajes)) {
      if (respuestas.includes(texto)) {
        return Number(puntos);
      }
    }

    // 👇 CLAVE: si no hay puntaje, devuelve el texto (comentario)
    return texto;
  }

}
module.exports = Utils;
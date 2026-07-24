const Hashids = require('hashids/cjs')
const numberKeys = 10;

class Utils {
  static encode(text) {
    const hashids = new Hashids(process.env.HASHIDS_SALT, numberKeys);
    const id = hashids.encode(text);
    return id;
  }

  static decode(text) {
    const hashids = new Hashids(process.env.HASHIDS_SALT, numberKeys);
    const id = hashids.decode(text);
    return id[0];
  }

  static asignarPuntaje(respuesta) {
    if (!respuesta || typeof respuesta !== 'string') return null;

    const texto = respuesta.trim();

    const textoLimpio = texto
      .replace(/[✅✔️☑️]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const soloNumero = textoLimpio.match(/^[1-5]$/);
    if (soloNumero) {
      return Number(soloNumero[0]);
    }

    const numeroEnParentesis = textoLimpio.match(/\(([1-5])\)\s*$/);
    if (numeroEnParentesis) {
      return Number(numeroEnParentesis[1]);
    }

    const numeroAntesParentesis = textoLimpio.match(/\b([1-5])\s*\(/);
    if (numeroAntesParentesis) {
      return Number(numeroAntesParentesis[1]);
    }

    const numeroAlInicio = textoLimpio.match(/^([1-5])\b/);
    if (numeroAlInicio) {
      return Number(numeroAlInicio[1]);
    }

    const puntajes = {
      5: ['Casi siempre', 'Excelente', 'Siempre'],
      4: ['Con frecuencia', 'Muy bueno', 'Muy Bueno'],
      3: ['Mas o menos', 'Más o menos', 'Bueno'],
      2: ['A veces', 'Regular'],
      1: ['Casi nunca', 'Ineficiente']
    };

    for (const [puntos, respuestas] of Object.entries(puntajes)) {
      if (respuestas.includes(textoLimpio)) {
        return Number(puntos);
      }
    }

    return texto;
  }

}
module.exports = Utils;
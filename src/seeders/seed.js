const db = require("../utils/database");
const Process = require('../models/operations/indicators/process.models');

const indicatorProcess = [
    { name: "Administracion" },
    { name: "Comunicación" },
    { name: "Financiero" },
    { name: "Marketing" },
    { name: "Tics" },
    { name: "Talento humano"},
    { name: "Ventas emisivo" },
    { name: "Ventas mayorista" },
    { name: "Ventas directas" },
  ];

db.sync({ force: false })

    .then(() => {
        console.log('Iniciando con el sembrario malicioso');
        indicatorProcess.forEach((rol) => Process.create(rol));
    })
    .catch((error) => console.log(error))
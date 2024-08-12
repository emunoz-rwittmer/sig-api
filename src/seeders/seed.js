const Roles = require('../models/catalogs/roles.models');
const Users = require('../models/catalogs/user.models');
const Departaments = require('../models/catalogs/departament.models');
const Positions = require('../models/catalogs/positions.models');
const StatusEvaluation = require('../models/operations/surveys/statusEvaluations.models')
const db = require("../utils/database");

const roles = [
    { id: 1, name: 'admin'},
    { id: 2, name: 'surveys'},
];

const users = [
    {
        firstName: 'Edison',
        lastName: 'Muñoz',
        email: 'javicho16_mu@hotmail.com',
        password: 'lahabana1.2',
        roleId: 1,
    },
];

const states = [
    {
        state: 'Pendiente',
    },
    {
        state: 'Completada',
    },
    {
        state: 'Caducada',
    },
];

const departaments = [
    { id: 1, name: 'Gerencia UIO'},
    { id: 2, name: 'Gerencia operaciones GPS'},
    { id: 3, name: 'Hotelería'},
    { id: 4, name: 'Recursos Humanos'},
    { id: 5, name: 'Finanzas/ Contabilidad'},
    { id: 6, name: 'Sistemas'},
    { id: 7, name: 'Ventas'},
    { id: 7, name: 'Operaciones'},
];
const positions = [
    { id: 1, name: 'Capitanes'},
    { id: 2, name: 'Timoneles / Marineros'},
    { id: 3, name: 'Maquinista'},
    { id: 4, name: 'Cabineros (Hoteleria)'},
    { id: 5, name: '⁠Barman (Hoteleria)'},
    { id: 6, name: 'Chef (Hoteleria)'},
    { id: 7, name: 'Ayudante de Cocina (Hoteleria)'},
];


db.sync({ force: false })

    .then(() => {
        console.log('Iniciando con el sembrario malicioso');

        departaments.forEach((rol) => Departaments.create(rol));

        setTimeout(() => {
            positions.forEach((user) => Positions.create(user));
        }, 1000);

        setTimeout(() => {
            states.forEach((state) => StatusEvaluation.create(state));
        }, 3000);
    })
    .catch((error) => console.log(error))
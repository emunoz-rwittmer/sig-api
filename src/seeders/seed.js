const Roles = require('../models/roles.models');
const Users = require('../models/user.models');
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


db.sync({ force: false })

    .then(() => {
        console.log('Iniciando con el sembrario malicioso');

        roles.forEach((rol) => Roles.create(rol));

        setTimeout(() => {
            users.forEach((user) => Users.create(user));
        }, 1000);
    })
    .catch((error) => console.log(error))
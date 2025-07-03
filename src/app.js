const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const initMongoBd = require('./utils/mongoDatabase');
const initModels = require('./models/init.models');
const routerApi = require('./routes');

const path = require('path');
const db = require('./utils/database');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(morgan('tiny'));

// linea para servir IMG o PDF
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads'), {
    setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/pdf');
    }
}));

db.authenticate()
    .then(() => console.log('base de datos autenticada'))
    .catch((error) => console.log(error));

initModels();
initMongoBd();

db.sync({ force: false })
    .then(() => console.log('Base de datos sincronizada'))
    .catch((error) => console.log(error));

routerApi(app);


module.exports = app;
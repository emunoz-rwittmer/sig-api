const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const initMongoBd = require('./utils/mongoDatabase');
const initModels = require('./models/init.models');
const routerApi = require('./routes');
const path = require('path');
const db = require('./utils/database');
const validateEnv = require('./config/env');
const errorHandler = require('./middlewares/errorHandler.middleware');

validateEnv();

// node-cron holds background timers alive; scheduling them during tests
// keeps the Jest process from exiting cleanly and can trigger jobs mid-run.
if (process.env.NODE_ENV !== 'test') {
    require('./utils/cronJobs');
}

const app = express();

app.use(cors({
    exposedHeaders: ['Content-Disposition']
}))
app.use(express.json({ limit: '10mb' }));
app.use(morgan('tiny'));

// linea para servir IMG o PDF
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

db.authenticate()
    .then(() => console.log('base de datos autenticada'))
    .catch((error) => console.log(error));

initModels();
initMongoBd();

// Exposed so tests can await schema sync before firing requests.
app.ready = db.sync({ alter: false })
    .then(() => console.log('Base de datos sincronizada'))
    .catch((error) => console.log(error));

routerApi(app);

app.use(errorHandler);

module.exports = app;
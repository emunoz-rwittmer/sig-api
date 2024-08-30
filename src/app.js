const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./utils/database');
const initMongoBd = require('./utils/mongoDatabase');
const initModels = require('./models/init.models');
const routerApi = require('./routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));
// linea para servir IMG o PDF
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));  
// linea para descargar archivos
app.get('/api/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/files', filename);
    res.download(filePath, (err) => {
        if (err) {
            console.error('Error al descargar el archivo:', err);
            res.status(500).send('Error al descargar el archivo.');
        }
    });
});

db.authenticate()
.then(() => console.log('base de datos autenticada'))
.catch((error) => console.log(error));

initModels();
initMongoBd();

db.sync({force: false})
.then(() => console.log('Base de datos sincronizada'))
.catch((error) => console.log(error));

routerApi(app);


module.exports = app;
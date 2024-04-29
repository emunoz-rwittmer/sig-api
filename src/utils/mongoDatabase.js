
const initMongoBd = () => {
    const host = process.env.DB_HOST_MONGO;
    const user = process.env.DB_USER_MONGO;
    const password = process.env.DB_PASSWORD_MONGO;
    const database = process.env.DB_NAME_MONGO;
    const mongoose = require('mongoose');
    mongoose.connect(`mongodb://${user}:${password}@${host}/${database}?authMechanism=DEFAULT&authSource=admin`, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
}

module.exports = initMongoBd;

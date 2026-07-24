const mongoose = require('mongoose');
const db = require('../../src/utils/database');

async function bootTestApp() {
    const app = require('../../src/app');
    await app.ready;

    // MySQL + many FK relationships: force-sync can fail on DROP ordering
    // unless FK checks are relaxed for the duration of the resync.
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.sync({ force: true });
    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    return app;
}

async function shutdownTestApp() {
    await db.close();
    await mongoose.connection.close();
}

module.exports = { bootTestApp, shutdownTestApp };

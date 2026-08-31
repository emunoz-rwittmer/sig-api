const db = require('../../src/utils/database');

// Sequelize's instance/static `.update({ updatedAt }, { silent: true })` does not
// reliably persist a custom updatedAt on this project's Sequelize/MySQL setup — verified
// empirically, it either no-ops or gets overwritten to "now" depending on call shape.
// A raw parameterized UPDATE is the only approach confirmed to work.
async function setUpdatedAt(tableName, id, isoDateTime) {
    await db.query(`UPDATE ${tableName} SET \`updatedAt\` = :updatedAt WHERE id = :id`, {
        replacements: { updatedAt: isoDateTime, id },
    });
}

module.exports = { setUpdatedAt };

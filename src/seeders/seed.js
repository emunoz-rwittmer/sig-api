const db = require("../utils/database");
const Process = require('../models/operations/indicators/process.models');
const Staff = require('../models/catalogs/staff.models');
const Documentation = require('../models/catalogs/documentation.models');
const StaffDocumentation = require('../models/catalogs/staffDocumentation.models');
const Utils = require('../utils/Utils');


const getPositionIds = positions => {
    if (typeof positions === 'string') {
        try {
            positions = JSON.parse(positions);
        } catch (error) {
            return [];
        }
    }

    if (!Array.isArray(positions)) positions = [positions];

    return positions.reduce((positionIds, position) => {
        const numericPosition = Number(position);

        if (Number.isInteger(numericPosition)) {
            positionIds.push(numericPosition);
            return positionIds;
        }

        try {
            const decodedPosition = Utils.decode(position);
            if (Number.isInteger(decodedPosition)) positionIds.push(decodedPosition);
        } catch (error) {
        }

        return positionIds;
    }, []);
};

const syncStaffDocumentation = async () => {
    const transaction = await db.transaction();

    try {
        const [staffMembers, documents, existingDocumentations] = await Promise.all([
            Staff.findAll({ attributes: ['id', 'positionId'], transaction }),
            Documentation.findAll({ attributes: ['id', 'positions'], transaction }),
            StaffDocumentation.findAll({ attributes: ['staffId', 'documentId'], transaction }),
        ]);

        const existingRelations = new Set(
            existingDocumentations.map(({ staffId, documentId }) => `${staffId}:${documentId}`)
        );

        const missingDocumentations = [];


        for (const staff of staffMembers) {
            for (const document of documents) {
                if (!getPositionIds(document.positions).includes(staff.positionId)) continue;

                const relationKey = `${staff.id}:${document.id}`;

                if (existingRelations.has(relationKey)) continue;

                console.log(existingRelations)

                missingDocumentations.push({
                    staffId: staff.id,
                    documentId: document.id,
                    status: 'pending',
                });
                existingRelations.add(relationKey);
            }
        }

        if (missingDocumentations.length) {
            await StaffDocumentation.bulkCreate(missingDocumentations, { transaction });
        }

        await transaction.commit();
        console.log(`Documentación creada: ${missingDocumentations.length}`);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

const runSeeder = async () => {
    await db.sync({ force: false });
    console.log('Iniciando con el sembrario malicioso');
    await syncStaffDocumentation();
};

if (require.main === module) {
    runSeeder()
        .catch(error => {
            console.error('Error ejecutando el seeder:', error);
            process.exitCode = 1;
        })
        .finally(() => db.close());
}

module.exports = { getPositionIds, syncStaffDocumentation };

const Documentation = require('../../models/catalogs/documentation.models');
const DocumentationPosition = require('../../models/catalogs/documentationPosition.models');
const Positions = require('../../models/catalogs/positions.models');
const db = require('../../utils/database');

class DocumentService {
    static async getAll() {
        try {
            const result = await Documentation.findAll({
                attributes: ['id', 'name'],
                include: [
                    {
                        model: DocumentationPosition,
                        as: 'positions',
                        attributes: ['id'],
                        include: [{
                            model: Positions,
                            as: 'position',
                        }]
                    }],
                order: [['name', 'ASC']]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getDocumentById(id) {
        try {
            const result = await Documentation.findOne({
                where: { id },
                attributes: ['id', 'name']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getDocumentsById(arrayIds) {
        try {
            const result = await Documentation.findAll({
                where: {
                    id: {
                        [Op.in]: arrayIds
                    }
                },
                attributes: ['id', 'name']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createDocument(documentData) {
        const transaction = await db.transaction();
        try {
            const { positionId, ...document } = documentData;

            const newDocument = await Documentation.create(document, { transaction });

            if (positionId?.length) {
                const relations = positionId.map(position => ({
                    documentId: newDocument.id,
                    positionId: position
                }));

                await DocumentationPosition.bulkCreate(relations, { transaction });
            }

            await transaction.commit();
            return newDocument;

        } catch (error) {
            await transaction.rollback();
            throw error;

        }
    }

    static async updateDocument(documentData, id) {
        const transaction = await db.transaction();
        try {
            const { positionId, ...document } = documentData;

            await Documentation.update(document, {
                where: { id },
                transaction
            });

            await DocumentationPosition.destroy({
                where: { documentId: id },
                transaction
            });

            if (positionId?.length) {
                const relations = positionId.map(position => ({
                    documentId: id,
                    positionId: position
                }));

                await DocumentationPosition.bulkCreate(relations, { transaction });
            }

            await transaction.commit();
            return true;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async delete(documentId) {
        try {
            const result = await Documentation.destroy({
                where: { id: documentId }
            });
            if (result) {
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }
}

module.exports = DocumentService;
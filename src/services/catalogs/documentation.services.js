const Documentation = require('../../models/catalogs/documentation.models');
const Staff = require('../../models/catalogs/staff.models');
const StaffDocumentation = require('../../models/catalogs/staffDocumentation.models');
const Utils = require('../../utils/Utils');
const { Op } = require('sequelize');
const db = require('../../utils/database');

class DocumentService {
    static async getAll() {
        try {
            const result = await Documentation.findAll({
                attributes: ['id', 'name', 'description', 'required','positions'],
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

    static async createDocument(document) {
        const transaction = await db.transaction();
        try {
            // Crear el documento
            const result = await Documentation.create(document, { transaction });

            // Si el documento tiene posiciones, crear StaffDocumentation para cada staff con esa posición
            if (document.positions && Array.isArray(document.positions) && document.positions.length > 0) {
                // Decodificar los IDs de posiciones
                const positionIds = document.positions.map(encodedId => {
                    try {
                        return Utils.decode(encodedId);
                    } catch (error) {
                        console.error('Error decodificando posición:', encodedId);
                        return null;
                    }
                }).filter(id => id !== null);

                // Buscar todos los staffs que tengan alguna de esas posiciones
                if (positionIds.length > 0) {
                    const staffMembers = await Staff.findAll({
                        where: {
                            positionId: {
                                [Op.in]: positionIds
                            }
                        },
                        attributes: ['id'],
                        transaction
                    });

                    // Crear StaffDocumentation para cada staff
                    if (staffMembers.length > 0) {
                        const staffDocumentations = staffMembers.map(staff => ({
                            staffId: staff.id,
                            documentId: result.id,
                            status: 'pending',
                        }));

                        await StaffDocumentation.bulkCreate(staffDocumentations, { transaction });
                    }
                }
            }

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateDocument(document, id) {
        const transaction = await db.transaction();
        try {
            // Obtener el documento actual para comparar posiciones
            const currentDocument = await Documentation.findOne({
                where: { id },
                transaction
            });

            if (!currentDocument) {
                throw new Error('Documento no encontrado');
            }

            // Obtener posiciones viejas y nuevas
            const oldPositions = currentDocument.positions || [];
            const newPositions = document.positions || [];

            // Asegurar que sean arrays
            const oldPositionIds = (Array.isArray(oldPositions) ? oldPositions : [oldPositions]).map(pos => {
                try {
                    return Utils.decode(pos);
                } catch (error) {
                    console.error('Error decodificando posición antigua:', pos);
                    return null;
                }
            }).filter(id => id !== null);

            const newPositionIds = (Array.isArray(newPositions) ? newPositions : [newPositions]).map(pos => {
                try {
                    return Utils.decode(pos);
                } catch (error) {
                    console.error('Error decodificando posición nueva:', pos);
                    return null;
                }
            }).filter(id => id !== null);

            // Identificar posiciones agregadas y eliminadas
            const positionsAdded = newPositionIds.filter(pos => !oldPositionIds.includes(pos));
            const positionsRemoved = oldPositionIds.filter(pos => !newPositionIds.includes(pos));

            // Crear StaffDocumentation para las posiciones agregadas
            if (positionsAdded.length > 0) {
                const staffMembers = await Staff.findAll({
                    where: {
                        positionId: {
                            [Op.in]: positionsAdded
                        }
                    },
                    attributes: ['id'],
                    transaction
                });

                if (staffMembers.length > 0) {
                    // Solo crear para staffs que no tengan ya una documentación para este documento
                    const existingDocumentations = await StaffDocumentation.findAll({
                        where: {
                            documentId: id,
                            staffId: {
                                [Op.in]: staffMembers.map(s => s.id)
                            }
                        },
                        attributes: ['staffId'],
                        transaction
                    });

                    const existingStaffIds = existingDocumentations.map(doc => doc.staffId);
                    const newStaffIds = staffMembers.filter(staff => !existingStaffIds.includes(staff.id)).map(staff => staff.id);

                    if (newStaffIds.length > 0) {
                        const staffDocumentations = staffMembers
                            .filter(staff => newStaffIds.includes(staff.id))
                            .map(staff => ({
                                staffId: staff.id,
                                documentId: id,
                                status: 'pending',
                            }));

                        await StaffDocumentation.bulkCreate(staffDocumentations, { transaction });
                    }
                }
            }

            // Eliminar StaffDocumentation para las posiciones removidas
            if (positionsRemoved.length > 0) {
                const staffToRemove = await Staff.findAll({
                    where: {
                        positionId: {
                            [Op.in]: positionsRemoved
                        }
                    },
                    attributes: ['id'],
                    transaction
                });

                if (staffToRemove.length > 0) {
                    await StaffDocumentation.destroy({
                        where: {
                            documentId: id,
                            staffId: {
                                [Op.in]: staffToRemove.map(s => s.id)
                            }
                        },
                        transaction
                    });
                }
            }

            // Actualizar el documento
            const result = await Documentation.update(document, {
                where: { id },
                transaction
            });

            await transaction.commit();
            return result;
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
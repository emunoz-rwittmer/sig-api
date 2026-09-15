const Documentation = require('../../models/catalogs/documentation.models');
const Staff = require('../../models/catalogs/staff.models');
const StaffDocumentation = require('../../models/catalogs/staffDocumentation.models');
const StaffCompany = require('../../models/catalogs/staffCompany.models');
const Company = require('../../models/catalogs/company.models');
const Yacht = require('../../models/catalogs/yacht.models');
const Utils = require('../../utils/Utils');
const { Op } = require('sequelize');
const db = require('../../utils/database');

// Estados posibles de `staff_documentation.status`, calculados y guardados
// por el flujo de carga de documentos del staff (ver
// `StaffService.uploadStaffDocumentation`) — no se recalculan aquí a partir
// de `expiryDate` para no divergir del valor que ya ve el staff en su propia
// pantalla de documentos (`StaffDocuments.jsx`).
const UPCOMING_STATUSES = ['expiring', 'expired'];
const UPCOMING_EXPIRATIONS_LIMIT = 10;

class DocumentService {
    static async getAll() {
        try {
            const result = await Documentation.findAll({
                attributes: ['id', 'name', 'description', 'required', 'type', 'positions'],
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

    // Totales de `staff_documentation.status` para staff activo — base de los
    // stat tiles de la pantalla de Documentación (vigentes/por vencer/
    // vencidos/cumplimiento).
    static async getDashboardStats() {
        const [rows, activeStaffCount] = await Promise.all([
            StaffDocumentation.findAll({
                attributes: ['status'],
                include: [{
                    model: Staff,
                    as: 'staff',
                    required: true,
                    where: { active: true },
                    attributes: [],
                }],
            }),
            Staff.count({ where: { active: true } }),
        ]);

        const totals = rows.reduce((acc, { status }) => {
            acc[status] = (acc[status] ?? 0) + 1;
            return acc;
        }, {});

        const valid = totals.valid ?? 0;
        const expiring = totals.expiring ?? 0;
        const expired = totals.expired ?? 0;
        const pending = totals.pending ?? 0;
        const total = valid + expiring + expired + pending;

        return {
            valid,
            expiring,
            expired,
            pending,
            activeStaffCount,
            compliancePct: total ? Math.round((valid / total) * 100) : 0,
        };
    }

    // % de staff activo con documento vigente, por tipo de documento — para
    // la grilla "Tipos de documento".
    static async getTypeCompletion() {
        const [types, rows] = await Promise.all([
            Documentation.findAll({ attributes: ['id', 'name', 'required'] }),
            StaffDocumentation.findAll({
                attributes: ['documentId', 'status'],
                include: [{
                    model: Staff,
                    as: 'staff',
                    required: true,
                    where: { active: true },
                    attributes: [],
                }],
            }),
        ]);

        const byType = new Map();
        rows.forEach(({ documentId, status }) => {
            const bucket = byType.get(documentId) ?? { valid: 0, total: 0 };
            bucket.total += 1;
            if (status === 'valid') bucket.valid += 1;
            byType.set(documentId, bucket);
        });

        return types.map((type) => {
            const bucket = byType.get(type.id) ?? { valid: 0, total: 0 };
            return {
                id: Utils.encode(type.id),
                name: type.name,
                required: type.required,
                pct: bucket.total ? Math.round((bucket.valid / bucket.total) * 100) : 0,
            };
        });
    }

    // Documentos de staff activo por vencer o ya vencidos, para la tabla
    // "Próximos vencimientos" — mismo criterio de asociaciones que
    // `StaffService.getExpiringDocumentsReport`, pero por `status` (no solo
    // la ventana de 30 días) y con la embarcación incluida.
    static async getUpcomingExpirations(limit = UPCOMING_EXPIRATIONS_LIMIT) {
        const rows = await StaffDocumentation.findAll({
            where: { status: { [Op.in]: UPCOMING_STATUSES } },
            attributes: ['id', 'staffId', 'status', 'expiryDate'],
            include: [
                {
                    model: Staff,
                    as: 'staff',
                    required: true,
                    where: { active: true },
                    attributes: ['firstName', 'lastName'],
                    include: [{
                        model: StaffCompany,
                        as: 'companies',
                        attributes: ['id'],
                        include: [{
                            model: Company,
                            as: 'company',
                            attributes: ['name'],
                            include: [{
                                model: Yacht,
                                as: 'yacht',
                                attributes: ['name'],
                            }],
                        }],
                    }],
                },
                {
                    model: Documentation,
                    as: 'document',
                    attributes: ['name'],
                },
            ],
            order: [['expiryDate', 'ASC']],
            limit,
        });

        return rows.map((row) => {
            const yachtName = row.staff?.companies?.[0]?.company?.yacht?.name ?? null;

            return {
                id: Utils.encode(row.id),
                staffId: Utils.encode(row.staffId),
                staffName: `${row.staff?.firstName ?? ''} ${row.staff?.lastName ?? ''}`.trim(),
                yachtName,
                documentName: row.document?.name ?? null,
                expiryDate: row.expiryDate,
                status: row.status,
            };
        });
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
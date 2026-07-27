const DocumentService = require('../../services/catalogs/documentation.services');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');

const getDocuments = async (req, res, next) => {
    try {
        const result = await DocumentService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getDocument = async (req, res, next) => {
    try {
        const documentId = Utils.decode(req.params.document_id);
        const result = await DocumentService.getDocumentById(documentId);
        if (!result) {
            throw new AppError('Documento no encontrado', 404);
        }
        result.dataValues.id = Utils.encode(result.dataValues.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createDocument = async (req, res, next) => {
    try {
        const document = req.body;
        // Asegurar que positions sea un array
        if (!Array.isArray(document.positions)) {
            document.positions = [document.positions];
        }

        const result = await DocumentService.createDocument(document);
        res.status(200).json({ data: 'resource created successfully', documentId: result.id });
    } catch (error) {
        next(error);
    }
}

const updateDocument = async (req, res, next) => {
    try {
        const documentId = Utils.decode(req.params.document_id);
        const existing = await DocumentService.getDocumentById(documentId);
        if (!existing) {
            throw new AppError('Documento no encontrado', 404);
        }
        const document = req.body;
        delete document.id;
        await DocumentService.updateDocument(document, documentId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteDocument = async (req, res, next) => {
    try {
        const documentId = Utils.decode(req.params.document_id);
        const result = await DocumentService.delete(documentId);
        res.status(200).json({ data: result })
    } catch (error) {
        next(error);
    }
}


const DocumentsController = {
    getDocuments,
    getDocument,
    createDocument,
    updateDocument,
    deleteDocument
}

module.exports = DocumentsController

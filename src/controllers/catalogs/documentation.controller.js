const DocumentService = require('../../services/catalogs/documentation.services');
const Utils = require('../../utils/Utils');

const getDocuments = async (req, res) => {
    try {
        const result = await DocumentService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.positions.map(p => {
                    p.position.dataValues.id = Utils.encode(p.position.dataValues.id);
                })
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getDocument = async (req, res) => {
    try {
        const documentId = Utils.decode(req.params.document_id);
        const result = await DocumentService.getDocumentById(documentId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createDocument = async (req, res) => {
    try {
        const document = req.body;
        if (document.positionId?.length) document.positionId = document.positionId.map(x => Utils.decode(x));
        await DocumentService.createDocument(document);

        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updateDocument = async (req, res) => {
    try {
        const documentId = Utils.decode(req.params.document_id);
        const document = req.body;
        delete document.id
        if (document.positionId?.length) document.positionId = document.positionId.map(x => Utils.decode(x));
        await DocumentService.updateDocument(document, documentId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const deleteDocument = async (req, res) => {
    try {
        const documentId = Utils.decode(req.params.document_id);
        const result = await DocumentService.delete(documentId);
        res.status(200).json({ data: result })
    } catch (error) {

        res.status(400).json(error.message);
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

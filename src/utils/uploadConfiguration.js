const uploadMiddleware = require('../middlewares/uploadMiddleware');
const { createUpload } = require('../utils/multer');

const uploadExcelFile = uploadMiddleware('single','file');

const uploadPdfFile = uploadMiddleware('single','file');

const uploadSingleImage = uploadMiddleware("array", 'logo');

const uploadImageFile = uploadMiddleware('single','file');

const uploadManyFiles = uploadMiddleware('array','documents');

// Material didáctico de inducciones: acepta video además de PDF/imagen/Office
// y admite archivos más pesados que el resto del catálogo (multer.js,
// instancia dedicada para no afectar el límite de 10MB por defecto).
const INDUCTION_MATERIAL_MIME_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'video/mp4',
    'video/webm',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const inductionUpload = createUpload({
    fileSize: 100 * 1024 * 1024,
    allowedMimeTypes: INDUCTION_MATERIAL_MIME_TYPES,
});

const uploadInductionMaterials = uploadMiddleware('array', 'materials', inductionUpload);

module.exports =  {
    uploadExcelFile,
    uploadSingleImage,
    uploadPdfFile,
    uploadImageFile,
    uploadManyFiles,
    uploadInductionMaterials,
};

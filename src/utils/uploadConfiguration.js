const fs = require('fs');
const path = require('path');
const multer = require('multer');
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const { createUpload } = require('../utils/multer');

const uploadExcelFile = uploadMiddleware('single','file');

const uploadPdfFile = uploadMiddleware('single','file');

const uploadSingleImage = uploadMiddleware("array", 'logo');

const uploadImageFile = uploadMiddleware('single','file');

const uploadManyFiles = uploadMiddleware('array','documents');

// Material didáctico de inducciones: acepta cualquier formato (el front lo
// anuncia así; un filtro MIME descartaría el archivo en silencio) y admite
// archivos más pesados que el resto del catálogo (instancia dedicada para no
// afectar el límite de 10MB por defecto).
const inductionUpload = createUpload({ fileSize: 100 * 1024 * 1024 });

const uploadInductionMaterials = uploadMiddleware('array', 'materials', inductionUpload);

// La matriz de preguntas de inducción solo se lee para devolver su contenido:
// se procesa en memoria y no se guarda en /uploads.
const inductionQuestionsUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, /\.xlsx?$/i.test(file.originalname)),
});

const uploadInductionQuestionsMatrix = uploadMiddleware('single', 'file', inductionQuestionsUpload);

// Misma lectura en memoria para la matriz de preguntas de encuestas RRHH.
const hrSurveyQuestionsUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, /\.xlsx?$/i.test(file.originalname)),
});

const uploadHrSurveyQuestionsMatrix = uploadMiddleware('single', 'file', hrSurveyQuestionsUpload);

// Evidencia de mantenimiento (fotos, facturas, informes): carpeta fija `uploads/maintenance`
// (no depende de ?file= en la URL), solo imágenes o PDF y hasta 5 archivos de 10MB.
const MAINTENANCE_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'maintenance');
const maintenanceUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            fs.mkdirSync(MAINTENANCE_UPLOAD_DIR, { recursive: true });
            cb(null, MAINTENANCE_UPLOAD_DIR);
        },
        filename: (req, file, cb) => {
            const extension = path.extname(file.originalname).toLowerCase();
            const base = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^\w-]+/g, '-').slice(0, 60);
            cb(null, `${base || 'archivo'}-${Date.now()}-${Math.round(Math.random() * 1e6)}${extension}`);
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 5 },
    fileFilter: (req, file, cb) => (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf'
        ? cb(null, true)
        : cb(new Error('Solo se aceptan imágenes o PDF'))),
});

const uploadMaintenanceAttachments = uploadMiddleware('array', 'files', maintenanceUpload);

module.exports =  {
    MAINTENANCE_UPLOAD_DIR,
    uploadMaintenanceAttachments,
    uploadExcelFile,
    uploadSingleImage,
    uploadPdfFile,
    uploadImageFile,
    uploadManyFiles,
    uploadInductionMaterials,
    uploadInductionQuestionsMatrix,
    uploadHrSurveyQuestionsMatrix,
};

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

module.exports =  {
    uploadExcelFile,
    uploadSingleImage,
    uploadPdfFile,
    uploadImageFile,
    uploadManyFiles,
    uploadInductionMaterials,
    uploadInductionQuestionsMatrix,
    uploadHrSurveyQuestionsMatrix,
};

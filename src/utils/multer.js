// config/multer.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "";
    
    // Determinar la carpeta según tipo MIME
    if (file.mimetype.startsWith('image/')) {
      folder = req.query.file || 'images';
    } else if (file.mimetype === 'application/pdf') {
      folder = req.query.file || 'pdfs';
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel') {
      folder = req.query.file || 'excel';
    } else {
      folder = req.query.file || 'files';
    }
    
    const uploadPath = path.join(__dirname, '..', '../uploads', folder);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generar nombre único con timestamp y extensión original
    const fileExtension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, fileExtension);
    const uniqueFileName = `${baseName}-${Date.now()}${fileExtension}`;
    cb(null, uniqueFileName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = upload;


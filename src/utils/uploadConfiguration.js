const uploadMiddleware = require('../middlewares/uploadMiddleware');

const uploadExcelFile = uploadMiddleware('single','file');

const uploadPdfFile = uploadMiddleware('single','file');

const uploadSingleImage = uploadMiddleware("array", 'logo');

const uploadImageFile = uploadMiddleware('single','file');

const uploadManyFiles = uploadMiddleware('array','documents');


module.exports =  {
    uploadExcelFile,
    uploadSingleImage,
    uploadPdfFile,
    uploadImageFile,
    uploadManyFiles
};

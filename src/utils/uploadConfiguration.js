const uploadMiddleware = require('../middlewares/uploadMiddleware');

const uploadExcelFile = uploadMiddleware('single','file');

const uploadSingleImage = uploadMiddleware("array", 'logo');

module.exports =  {
    uploadExcelFile,
    uploadSingleImage
};

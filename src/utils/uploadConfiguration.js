const uploadMiddleware = require('../middlewares/uploadMiddleware');

const uploadExcelFile = uploadMiddleware('file');

module.exports =  {
    uploadExcelFile
};

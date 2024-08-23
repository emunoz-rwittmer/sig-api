const upload = require('../utils/multer');
const multer = require('multer');

const uploadMiddleware = (fields = []) => (req, res, next) => {
    const multerMiddleware =  upload.single(fields);
    multerMiddleware(req, res, function (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json('File size exceeds the limit of 3MB');
        }
        next();
    });
};

module.exports = uploadMiddleware;

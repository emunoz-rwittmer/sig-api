const upload = require('../utils/multer');
const multer = require('multer');

const uploadMiddleware = (type,fields = []) => (req, res, next) => {
    const multerMiddleware = type === 'array' ? upload.array(fields) : 
                             type === 'any' ? upload.any() : 
                             type === 'single' ? upload.single(fields) : upload.fields(fields);
    multerMiddleware(req, res, function (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json('File size exceeds the limit of 3MB');
        }
        next();
    });
};

module.exports = uploadMiddleware;

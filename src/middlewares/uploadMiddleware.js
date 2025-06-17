const upload = require('../utils/multer');
const multer = require('multer');

const uploadMiddleware = (type, fields = []) => (req, res, next) => {
    let multerMiddleware;

    if (type === 'array') {
        multerMiddleware = upload.array(fields); // fields es un string en este caso
    } else if (type === 'any') {
        multerMiddleware = upload.any();
    } else if (type === 'single') {
        multerMiddleware = upload.single(fields);
    } else if (type === 'fields') {
        multerMiddleware = upload.fields(fields); // fields como [{ name: 'logo' }, { name: 'background' }]
    }

    multerMiddleware(req, res, function (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            console.log('primer if',err)
            return res.status(400).json('File size exceeds the limit of 5MB');
        }
        if (err) {
            console.log('segundo if',err)
            return res.status(500).json('File upload error');
        }
        next();
    });
};

module.exports = uploadMiddleware;

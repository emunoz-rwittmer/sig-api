const upload = require('../utils/multer');

const uploadMiddleware = (type, fields = [], uploader = upload) => (req, res, next) => {
    let multerMiddleware;

    if (type === 'array') {
        multerMiddleware = uploader.array(fields); // fields es un string en este caso
    } else if (type === 'any') {
        multerMiddleware = uploader.any();
    } else if (type === 'single') {
        multerMiddleware = uploader.single(fields);
    } else if (type === 'fields') {
        multerMiddleware = uploader.fields(fields); // fields como [{ name: 'logo' }, { name: 'background' }]
    }

    multerMiddleware(req, res, function (err) {
        if (err) {
            console.error('Error en uploadStaffDocumentation:', err);
            return res.status(400).json(err.message || 'Error uploading file');
        }
        next();
    });

};

module.exports = uploadMiddleware;

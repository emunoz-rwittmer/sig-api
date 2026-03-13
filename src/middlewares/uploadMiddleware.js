const upload = require('../utils/multer');

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
        if (err) {
            console.error('Error en uploadStaffDocumentation:', err);
            return res.status(400).json(err.message || 'Error uploading file');
        }
        next();
    });

};

module.exports = uploadMiddleware;

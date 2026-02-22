const multer = require('multer');
const path = require('path');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = 'application/pdf';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype !== ALLOWED_MIME) {
    const err = new Error('Only PDF files are allowed.');
    err.statusCode = 400;
    return cb(err);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

/**
 * Single-file upload middleware for resume PDF.
 * Field name: 'resume'
 * Puts file in req.file (buffer in memory).
 */
const uploadResume = upload.single('resume');

module.exports = { upload, uploadResume };

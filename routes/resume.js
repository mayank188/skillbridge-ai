const express = require('express');
const { uploadResume } = require('../middleware/upload');
const { uploadResumeHandler, saveSkillsHandler } = require('../controllers/resumeController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/upload', uploadResume, multerErrorHandler, uploadResumeHandler);
// Save skills explicitly (requires auth)
router.post('/save-skills', authenticate, saveSkillsHandler);

function multerErrorHandler(err, req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    err.message = 'File too large. Maximum size is 5 MB.';
    err.statusCode = 413;
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    err.message = 'Unexpected field. Use field name "resume" for the PDF file.';
    err.statusCode = 400;
  }
  next(err);
}

module.exports = router;

const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  generateProjectAssignment,
  submitProject,
  evaluateProject,
  getProjectHistory,
  getProjectDetails,
} = require('../controllers/projectController');

const router = express.Router();

// All routes require authentication and candidate role
router.use(authenticate);
router.use(requireRole('candidate'));

// Project endpoints
router.post('/generate', generateProjectAssignment);
router.post('/submit', submitProject);
router.post('/:projectId/evaluate', evaluateProject);
router.get('/history', getProjectHistory);
router.get('/:projectId', getProjectDetails);

module.exports = router;

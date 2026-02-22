const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  getDashboard,
  extractResumeSkills,
  getJobListings,
  applyForJob,
  getSkillGapAnalysis,
  getApplicationCounts,
  getRecentApplications,
} = require('../controllers/candidateController');

const router = express.Router();

// All routes require authentication and candidate role
router.use(authenticate);
router.use(requireRole('candidate'));

// Dashboard
router.get('/dashboard', getDashboard);

// Debug: application counts
router.get('/applications/counts', getApplicationCounts);
router.get('/applications/recent', getRecentApplications);

// Resume and skills
router.post('/resume/upload-and-extract', upload.single('resume'), extractResumeSkills);

// Jobs and applications
router.get('/jobs', getJobListings);
router.post('/jobs/apply', applyForJob);
router.get('/jobs/:jobId/gap-analysis', getSkillGapAnalysis);

module.exports = router;

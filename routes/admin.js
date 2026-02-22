const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  getPlatformAnalytics,
  getAllUsers,
  toggleUserStatus,
  getAllJobs,
  toggleJobStatus,
} = require('../controllers/adminController');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));

// Analytics
router.get('/analytics', getPlatformAnalytics);

// User management
router.get('/users', getAllUsers);
router.patch('/users/:userId/status', toggleUserStatus);

// Job management
router.get('/jobs', getAllJobs);
router.patch('/jobs/:jobId/status', toggleJobStatus);

module.exports = router;

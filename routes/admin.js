const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  getPlatformAnalytics,
  getAnalytics,
  getRecentActivityList,
  getDashboardOverview,

  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  setUserStatus,
  resetUserPassword,
  addUserWarning,
  bulkUserAction,

  getAllJobs,
  createJob,
  getJobById,
  updateJob,
  deleteJob,
  toggleJobStatus,

  getAllCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  setCompanyStatus,

  getAllApplications,
  updateApplicationStatus,

  getSkillTests,

  getReports,
  reviewReport,
  deleteReport,

  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,

  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  getSessions,
  revokeSession,
  getActivityLogs,

  globalSearch,
  getModerationQueue,
} = require('../controllers/adminController');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));

// --- Dashboard & Analytics ---
router.get('/overview', getDashboardOverview);
router.get('/stats', getPlatformAnalytics);
router.get('/analytics', getAnalytics);
router.get('/activity', getRecentActivityList);

// --- Global Search ---
router.get('/search', globalSearch);

// --- User Management ---
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserById);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);
router.patch('/users/:userId/status', setUserStatus);
router.patch('/users/:userId/password', resetUserPassword);
router.post('/users/:userId/warning', addUserWarning);
router.post('/users/bulk', bulkUserAction);

// --- Job Management ---
router.get('/jobs', getAllJobs);
router.post('/jobs', createJob);
router.get('/jobs/:jobId', getJobById);
router.put('/jobs/:jobId', updateJob);
router.delete('/jobs/:jobId', deleteJob);
router.patch('/jobs/:jobId/status', toggleJobStatus);

// --- Company Management ---
router.get('/companies', getAllCompanies);
router.post('/companies', createCompany);
router.put('/companies/:companyId', updateCompany);
router.delete('/companies/:companyId', deleteCompany);
router.patch('/companies/:companyId/status', setCompanyStatus);

// --- Applications ---
router.get('/applications', getAllApplications);
router.patch('/applications/:applicationId/status', updateApplicationStatus);

// --- Skill Tests ---
router.get('/skill-tests', getSkillTests);

// --- Moderation / Reports ---
router.get('/reports', getReports);
router.patch('/reports/:reportId', reviewReport);
router.delete('/reports/:reportId', deleteReport);
router.get('/moderation-queue', getModerationQueue);

// --- Notifications ---
router.get('/notifications', getNotifications);
router.patch('/notifications/read-all', markAllNotificationsRead);
router.patch('/notifications/:notificationId/read', markNotificationRead);
router.delete('/notifications/:notificationId', deleteNotification);

// --- Settings / Profile ---
router.get('/profile', getAdminProfile);
router.put('/profile', updateAdminProfile);
router.patch('/profile/password', changeAdminPassword);

// --- Sessions ---
router.get('/sessions', getSessions);
router.patch('/sessions/:sessionId/revoke', revokeSession);

// --- Activity Logs ---
router.get('/activity-logs', getActivityLogs);

module.exports = router;

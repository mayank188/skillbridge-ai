const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  createJob,
  getMyJobs,
  getCandidatesForJob,
  shortlistCandidate,
  rejectCandidate,
  updateJob,
  deleteJob,
} = require('../controllers/jobController');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('recruiter', 'admin'));

router.post('/', createJob);
router.get('/', getMyJobs);
router.get('/:id/candidates', getCandidatesForJob);
router.post('/:id/shortlist', shortlistCandidate);
router.post('/:id/reject', rejectCandidate);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);

module.exports = router;

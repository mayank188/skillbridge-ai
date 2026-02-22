const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  createJob,
  getMyJobs,
  getCandidatesForJob,
  shortlistCandidate,
} = require('../controllers/jobController');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('recruiter', 'admin'));

router.post('/', createJob);
router.get('/', getMyJobs);
router.get('/:id/candidates', getCandidatesForJob);
router.post('/:id/shortlist', shortlistCandidate);

module.exports = router;

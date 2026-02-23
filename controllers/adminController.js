const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const TestResult = require('../models/TestResult');

/**
 * Get platform analytics
 */
async function getPlatformAnalytics(req, res, next) {
  try {
    const totalUsers = await User.countDocuments();
    const totalCandidates = await User.countDocuments({ role: 'candidate' });
    const totalRecruiters = await User.countDocuments({ role: 'recruiter' });
    const totalJobs = await Job.countDocuments();
    const totalApplications = await Application.countDocuments();

    // Calculate average test score
    const testStats = await TestResult.aggregate([
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$score' },
          totalTests: { $sum: 1 },
        },
      },
    ]);

    const avgTestScore = testStats[0]?.avgScore || 0;
    const totalTests = testStats[0]?.totalTests || 0;

    // Get skill distribution
    const skillStats = await User.aggregate([
      { $match: { role: 'candidate' } },
      { $unwind: '$skills' },
      {
        $group: {
          _id: '$skills.category',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get most demanded skills
    const demandedSkills = await Job.aggregate([
      { $unwind: '$requiredSkills' },
      {
        $group: {
          _id: '$requiredSkills',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      totalUsers,
      totalCandidates,
      totalRecruiters,
      totalJobs,
      totalApplications,
      totalTests,
      avgTestScore: Math.round(avgTestScore),
      skillDistribution: skillStats,
      mostDemandedSkills: demandedSkills.map((s) => ({
        skill: s._id,
        demand: s.count,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all users
 */
async function getAllUsers(req, res, next) {
  try {
    const { role, page = 1, limit = 20 } = req.query;

    const query = {};
    if (role) query.role = role;

    const skip = (page - 1) * limit;
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Suspend/activate user
 */
async function toggleUserStatus(req, res, next) {
  try {
    const { userId } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      const err = new Error('Active status must be a boolean.');
      err.statusCode = 400;
      return next(err);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { active },
      { new: true }
    ).select('-password');

    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      return next(err);
    }

    res.json({
      message: active ? 'User activated.' : 'User suspended.',
      user,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all jobs
 */
async function getAllJobs(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;
    const jobs = await Job.find()
      .populate('recruiterId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Job.countDocuments();

    res.json({
      jobs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Approve/reject job posting
 */
async function toggleJobStatus(req, res, next) {
  try {
    const { jobId } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      const err = new Error('Status must be active or suspended.');
      err.statusCode = 400;
      return next(err);
    }

    const job = await Job.findByIdAndUpdate(jobId, { status }, { new: true });

    if (!job) {
      const err = new Error('Job not found.');
      err.statusCode = 404;
      return next(err);
    }

    res.json({
      message: `Job ${status}.`,
      job,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get moderation queue for pending job approvals
 */
async function getModerationQueue(req, res, next) {
  try {
    // Get pending jobs awaiting approval/rejection
    const pendingJobs = await Job.find({ status: 'pending' || null })
      .populate('recruiterId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      queue: pendingJobs.map((job) => ({
        _id: job._id,
        title: job.title,
        company: job.company,
        description: job.description,
        submittedBy: job.recruiterId?.name || 'Unknown',
        createdAt: job.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPlatformAnalytics,
  getAllUsers,
  toggleUserStatus,
  getAllJobs,
  toggleJobStatus,
  getModerationQueue,
};

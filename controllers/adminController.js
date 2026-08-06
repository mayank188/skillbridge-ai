const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const TestResult = require('../models/TestResult');
const ProjectSubmission = require('../models/ProjectSubmission');
const Company = require('../models/Company');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const Session = require('../models/Session');
const { getPlatformStats, getDashboardAnalytics, getRecentActivity } = require('../services/adminAnalyticsService');

const { Schema } = mongoose;

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

async function getPlatformAnalytics(req, res, next) {
  try {
    const stats = await getPlatformStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

async function getAnalytics(req, res, next) {
  try {
    const analytics = await getDashboardAnalytics();
    res.json(analytics);
  } catch (err) {
    next(err);
  }
}

async function getRecentActivityList(req, res, next) {
  try {
    const activity = await getRecentActivity();
    res.json({ activity });
  } catch (err) {
    next(err);
  }
}

async function getDashboardOverview(req, res, next) {
  try {
    const [stats, analytics, activity] = await Promise.all([
      getPlatformStats(),
      getDashboardAnalytics(),
      getRecentActivity(),
    ]);
    res.json({ ...stats, ...analytics, recentActivity: activity });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

async function getAllUsers(req, res, next) {
  try {
    const { role, status, search, sort = 'createdAt', order = 'desc', page = 1, limit = 20 } = req.query;

    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const allowedSorts = ['createdAt', 'name', 'email', 'role', 'status'];
    const sortField = allowedSorts.includes(sort) ? sort : 'createdAt';
    const sortDir = order === 'asc' ? 1 : -1;

    const skip = (Number(page) - 1) * Number(limit);
    const users = await User.find(query)
      .select('-password')
      .sort({ [sortField]: sortDir })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function getUserById(req, res, next) {
  try {
    const { userId } = req.params;
    if (!Schema.Types.ObjectId.isValid(userId)) {
      const err = new Error('Invalid user ID.');
      err.statusCode = 400;
      return next(err);
    }
    const user = await User.findById(userId).select('-password');
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      return next(err);
    }

    const [applications, testResults, projects, jobs] = await Promise.all([
      Application.find({ candidateId: userId }).populate('jobId', 'title company').sort({ createdAt: -1 }),
      TestResult.find({ candidateId: userId }).sort({ createdAt: -1 }),
      ProjectSubmission.find({ candidateId: userId }).sort({ createdAt: -1 }),
      user.role === 'recruiter' ? Job.find({ recruiterId: userId }).sort({ createdAt: -1 }) : [],
    ]);

    res.json({ user, applications, testResults, projects, jobs });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { userId } = req.params;
    const { name, email, role, phone, headline, bio, location, avatar } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      return next(err);
    }

    if (name !== undefined) user.name = String(name).trim() || user.name;
    if (email !== undefined) user.email = String(email).trim().toLowerCase();
    if (role !== undefined && ['candidate', 'recruiter', 'admin'].includes(role)) user.role = role;
    if (phone !== undefined) user.phone = String(phone).trim();
    if (headline !== undefined) user.headline = String(headline).trim();
    if (bio !== undefined) user.bio = String(bio).trim();
    if (location !== undefined) user.location = String(location).trim();
    if (avatar !== undefined) user.avatar = String(avatar).trim();

    await user.save();

    await ActivityLog.create({
      userId: req.user._id,
      actor: req.user.name,
      action: 'update_user',
      targetType: 'User',
      targetId: String(userId),
      details: `Updated user ${user.name}`,
    });

    const clean = user.toJSON();
    delete clean.password;
    res.json({ message: 'User updated successfully.', user: clean });
  } catch (err) {
    if (err.code === 11000) {
      const e = new Error('Email already in use.');
      e.statusCode = 409;
      return next(e);
    }
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const { userId } = req.params;
    if (String(userId) === String(req.user._id)) {
      const err = new Error('You cannot delete your own account.');
      err.statusCode = 400;
      return next(err);
    }
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      return next(err);
    }
    await Promise.all([
      Application.deleteMany({ $or: [{ candidateId: userId }, { jobId: userId }] }),
      TestResult.deleteMany({ candidateId: userId }),
      ProjectSubmission.deleteMany({ candidateId: userId }),
      Job.deleteMany({ recruiterId: userId }),
      Session.deleteMany({ userId }),
    ]);
    res.json({ message: 'User deleted successfully.', userId });
  } catch (err) {
    next(err);
  }
}

async function setUserStatus(req, res, next) {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    if (!['active', 'suspended', 'banned'].includes(status)) {
      const err = new Error('Status must be active, suspended, or banned.');
      err.statusCode = 400;
      return next(err);
    }

    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      return next(err);
    }

    user.status = status;
    if (status === 'banned') user.banReason = reason || user.banReason || '';
    if (status === 'active') user.banReason = '';
    await user.save();

    await ActivityLog.create({
      userId: req.user._id,
      actor: req.user.name,
      action: `user_${status}`,
      targetType: 'User',
      targetId: String(userId),
      details: `${status} user ${user.name}${reason ? `: ${reason}` : ''}`,
    });

    const clean = user.toJSON();
    delete clean.password;
    res.json({ message: `User ${status}.`, user: clean });
  } catch (err) {
    next(err);
  }
}

async function resetUserPassword(req, res, next) {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      const err = new Error('New password must be at least 6 characters.');
      err.statusCode = 400;
      return next(err);
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      return next(err);
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    await ActivityLog.create({
      userId: req.user._id,
      actor: req.user.name,
      action: 'reset_password',
      targetType: 'User',
      targetId: String(userId),
      details: `Reset password for ${user.name}`,
    });

    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    next(err);
  }
}

async function addUserWarning(req, res, next) {
  try {
    const { userId } = req.params;
    const { message, notes } = req.body;

    if (!message) {
      const err = new Error('Warning message is required.');
      err.statusCode = 400;
      return next(err);
    }

    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      return next(err);
    }

    user.warnings.push({ message: String(message), notes: notes || '' });
    await user.save();

    await ActivityLog.create({
      userId: req.user._id,
      actor: req.user.name,
      action: 'add_warning',
      targetType: 'User',
      targetId: String(userId),
      details: `Warning added for ${user.name}: ${message}`,
    });

    res.json({ message: 'Warning added.', user: user.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function bulkUserAction(req, res, next) {
  try {
    const { userIds, action } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      const err = new Error('userIds array is required.');
      err.statusCode = 400;
      return next(err);
    }
    if (!['delete', 'suspend', 'activate', 'ban'].includes(action)) {
      const err = new Error('Invalid bulk action.');
      err.statusCode = 400;
      return next(err);
    }

    const validIds = userIds.filter((id) => Schema.Types.ObjectId.isValid(id));
    const filter = { _id: { $in: validIds, $ne: req.user._id } };

    let result;
    if (action === 'delete') {
      result = await User.deleteMany(filter);
      await Promise.all([
        Application.deleteMany({ $or: [{ candidateId: { $in: validIds } }, { jobId: { $in: validIds } }] }),
        TestResult.deleteMany({ candidateId: { $in: validIds } }),
        ProjectSubmission.deleteMany({ candidateId: { $in: validIds } }),
        Job.deleteMany({ recruiterId: { $in: validIds } }),
      ]);
    } else {
      const status = action === 'suspend' ? 'suspended' : action === 'ban' ? 'banned' : 'active';
      result = await User.updateMany(filter, { $set: { status } });
    }

    await ActivityLog.create({
      userId: req.user._id,
      actor: req.user.name,
      action: `bulk_${action}`,
      targetType: 'User',
      details: `${action} ${validIds.length} users`,
    });

    res.json({ message: `Bulk ${action} completed.`, count: result.deletedCount ?? result.modifiedCount ?? validIds.length });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ */
/* Jobs                                                                */
/* ------------------------------------------------------------------ */

async function getAllJobs(req, res, next) {
  try {
    const { status, search, jobType, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (jobType) query.jobType = jobType;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const jobs = await Job.find(query)
      .populate('recruiterId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const populated = await Promise.all(
      jobs.map(async (job) => {
        const appCount = await Application.countDocuments({ jobId: job._id });
        return { ...job.toObject(), _applications: appCount };
      })
    );

    const total = await Job.countDocuments(query);
    res.json({ jobs: populated, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
}

async function createJob(req, res, next) {
  try {
    const { title, company, description, requiredSkills, minimumScore, location, salary, jobType, status } = req.body;

    if (!title?.trim() || !description?.trim() || !jobType) {
      const err = new Error('Title, description, and job type are required.');
      err.statusCode = 400;
      return next(err);
    }

    const job = await Job.create({
      recruiterId: req.user._id,
      title: title.trim(),
      company: (company ?? '').trim(),
      description: description.trim(),
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills.map((s) => String(s).trim()).filter(Boolean) : [],
      minimumScore: Number(minimumScore) || 0,
      location: (location ?? '').trim(),
      salary: (salary ?? '').trim(),
      jobType,
      status: status || 'active',
    });

    await ActivityLog.create({
      userId: req.user._id,
      actor: req.user.name,
      action: 'create_job',
      targetType: 'Job',
      targetId: String(job._id),
      details: `Created job "${job.title}"`,
    });

    res.status(201).json({ message: 'Job created successfully.', job });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(' ');
      const e = new Error(msg || 'Validation failed.');
      e.statusCode = 400;
      return next(e);
    }
    next(err);
  }
}

async function getJobById(req, res, next) {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId).populate('recruiterId', 'name email');
    if (!job) {
      const err = new Error('Job not found.');
      err.statusCode = 404;
      return next(err);
    }
    const applications = await Application.find({ jobId }).populate('candidateId', 'name email avatar role');
    const appCounts = {
      total: applications.length,
      pending: applications.filter((a) => a.status === 'pending').length,
      shortlisted: applications.filter((a) => a.status === 'shortlisted').length,
      accepted: applications.filter((a) => a.status === 'accepted').length,
      rejected: applications.filter((a) => a.status === 'rejected').length,
    };
    res.json({ job, applications, appCounts });
  } catch (err) {
    next(err);
  }
}

async function updateJob(req, res, next) {
  try {
    const { jobId } = req.params;
    const { title, company, description, requiredSkills, minimumScore, location, salary, jobType, status } = req.body;

    const job = await Job.findById(jobId);
    if (!job) {
      const err = new Error('Job not found.');
      err.statusCode = 404;
      return next(err);
    }

    const updates = {};
    if (title !== undefined) updates.title = String(title).trim();
    if (company !== undefined) updates.company = String(company).trim();
    if (description !== undefined) updates.description = String(description).trim();
    if (requiredSkills !== undefined) updates.requiredSkills = Array.isArray(requiredSkills) ? requiredSkills.map((s) => String(s).trim()).filter(Boolean) : [];
    if (minimumScore !== undefined) updates.minimumScore = Number(minimumScore) || 0;
    if (location !== undefined) updates.location = String(location).trim();
    if (salary !== undefined) updates.salary = String(salary).trim();
    if (jobType !== undefined) updates.jobType = jobType;
    if (status !== undefined) updates.status = status;

    const updatedJob = await Job.findByIdAndUpdate(jobId, updates, { new: true, runValidators: true });
    res.json({ message: 'Job updated successfully.', job: updatedJob });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(' ');
      const e = new Error(msg || 'Validation failed.');
      e.statusCode = 400;
      return next(e);
    }
    next(err);
  }
}

async function deleteJob(req, res, next) {
  try {
    const { jobId } = req.params;
    const job = await Job.findByIdAndDelete(jobId);
    if (!job) {
      const err = new Error('Job not found.');
      err.statusCode = 404;
      return next(err);
    }
    await Application.deleteMany({ jobId });
    res.json({ message: 'Job deleted successfully.', jobId });
  } catch (err) {
    next(err);
  }
}

async function toggleJobStatus(req, res, next) {
  try {
    const { jobId } = req.params;
    const { status } = req.body;
    if (!['active', 'suspended', 'pending', 'closed'].includes(status)) {
      const err = new Error('Status must be active, suspended, pending, or closed.');
      err.statusCode = 400;
      return next(err);
    }
    const job = await Job.findByIdAndUpdate(jobId, { status }, { new: true });
    if (!job) {
      const err = new Error('Job not found.');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ message: `Job ${status}.`, job });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ */
/* Companies                                                           */
/* ------------------------------------------------------------------ */

async function getAllCompanies(req, res, next) {
  try {
    const { status, verificationStatus, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (verificationStatus) query.verificationStatus = verificationStatus;
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { industry: { $regex: search, $options: 'i' } }];

    const skip = (Number(page) - 1) * Number(limit);
    const companies = await Company.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
    const total = await Company.countDocuments(query);
    res.json({ companies, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
}

async function createCompany(req, res, next) {
  try {
    const { name, email, website, description, industry, size, location } = req.body;
    if (!name?.trim()) {
      const err = new Error('Company name is required.');
      err.statusCode = 400;
      return next(err);
    }
    const company = await Company.create({
      name: name.trim(),
      email: (email || '').trim(),
      website: (website || '').trim(),
      description: (description || '').trim(),
      industry: (industry || '').trim(),
      size: (size || '').trim(),
      location: (location || '').trim(),
      ownerId: req.user._id,
    });
    res.status(201).json({ message: 'Company created.', company });
  } catch (err) {
    next(err);
  }
}

async function updateCompany(req, res, next) {
  try {
    const { companyId } = req.params;
    const updates = {};
    for (const field of ['name', 'email', 'website', 'logo', 'description', 'industry', 'size', 'location']) {
      if (req.body[field] !== undefined) updates[field] = String(req.body[field]).trim();
    }
    const company = await Company.findByIdAndUpdate(companyId, updates, { new: true, runValidators: true });
    if (!company) {
      const err = new Error('Company not found.');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ message: 'Company updated.', company });
  } catch (err) {
    next(err);
  }
}

async function deleteCompany(req, res, next) {
  try {
    const { companyId } = req.params;
    const company = await Company.findByIdAndDelete(companyId);
    if (!company) {
      const err = new Error('Company not found.');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ message: 'Company deleted.', companyId });
  } catch (err) {
    next(err);
  }
}

async function setCompanyStatus(req, res, next) {
  try {
    const { companyId } = req.params;
    const { status, verificationStatus } = req.body;

    const company = await Company.findById(companyId);
    if (!company) {
      const err = new Error('Company not found.');
      err.statusCode = 404;
      return next(err);
    }
    if (status && ['active', 'suspended'].includes(status)) company.status = status;
    if (verificationStatus && ['pending', 'verified', 'rejected'].includes(verificationStatus)) {
      company.verificationStatus = verificationStatus;
    }
    await company.save();
    res.json({ message: 'Company updated.', company });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ */
/* Applications                                                        */
/* ------------------------------------------------------------------ */

async function getAllApplications(req, res, next) {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    let searchFilter = {};
    if (search) {
      const jobMatch = await Job.find({ $or: [{ title: { $regex: search, $options: 'i' } }, { company: { $regex: search, $options: 'i' } }] }).select('_id');
      const userIds = await User.find({ $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }).select('_id');
      searchFilter = {
        $or: [
          { jobId: { $in: jobMatch.map((j) => j._id) } },
          { candidateId: { $in: userIds.map((u) => u._id) } },
        ],
      };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const applications = await Application.find({ ...query, ...searchFilter })
      .populate('jobId', 'title company')
      .populate('candidateId', 'name email avatar role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    const total = await Application.countDocuments({ ...query, ...searchFilter });

    res.json({ applications, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
}

async function updateApplicationStatus(req, res, next) {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;
    if (!['pending', 'shortlisted', 'accepted', 'rejected'].includes(status)) {
      const err = new Error('Invalid application status.');
      err.statusCode = 400;
      return next(err);
    }
    const application = await Application.findByIdAndUpdate(applicationId, { status }, { new: true })
      .populate('jobId', 'title company')
      .populate('candidateId', 'name email avatar');
    if (!application) {
      const err = new Error('Application not found.');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ message: `Application ${status}.`, application });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ */
/* Skill Tests                                                         */
/* ------------------------------------------------------------------ */

async function getSkillTests(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const tests = await TestResult.find()
      .populate('candidateId', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    const total = await TestResult.countDocuments();

    const stats = await TestResult.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$score' }, count: { $sum: 1 } } },
    ]);

    const leaderboard = await TestResult.aggregate([
      { $sort: { score: -1 } },
      { $limit: 10 },
      {
        $lookup: { from: 'users', localField: 'candidateId', foreignField: '_id', as: 'candidate' },
      },
      { $unwind: { path: '$candidate', preserveNullAndEmptyArrays: true } },
      { $project: { score: 1, duration: 1, createdAt: 1, 'candidate.name': 1, 'candidate.email': 1, 'candidate.avatar': 1 } },
    ]);

    res.json({
      tests,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
      avgScore: Math.round(stats[0]?.avgScore || 0),
      totalTests: stats[0]?.count || 0,
      leaderboard,
    });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ */
/* Reports / Moderation                                                */
/* ------------------------------------------------------------------ */

async function getReports(req, res, next) {
  try {
    const { status, targetType, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (targetType) query.targetType = targetType;

    const skip = (Number(page) - 1) * Number(limit);
    const reports = await Report.find(query)
      .populate('reporterId', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    const total = await Report.countDocuments(query);

    // Resolve target names
    const resolved = await Promise.all(
      reports.map(async (report) => {
        let target = null;
        if (report.targetModel === 'User') target = await User.findById(report.targetId).select('name email avatar role status');
        else if (report.targetModel === 'Job') target = await Job.findById(report.targetId).select('title company');
        else if (report.targetModel === 'Company') target = await Company.findById(report.targetId).select('name');
        return { ...report.toObject(), target };
      })
    );

    res.json({ reports: resolved, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
}

async function reviewReport(req, res, next) {
  try {
    const { reportId } = req.params;
    const { status, adminNote } = req.body;

    if (!['reviewed', 'dismissed', 'action_taken'].includes(status)) {
      const err = new Error('Invalid report status.');
      err.statusCode = 400;
      return next(err);
    }

    const report = await Report.findByIdAndUpdate(
      reportId,
      { status, adminNote: adminNote || '', reviewedBy: req.user._id, reviewedAt: new Date() },
      { new: true }
    );
    if (!report) {
      const err = new Error('Report not found.');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ message: 'Report reviewed.', report });
  } catch (err) {
    next(err);
  }
}

async function deleteReport(req, res, next) {
  try {
    const { reportId } = req.params;
    const report = await Report.findByIdAndDelete(reportId);
    if (!report) {
      const err = new Error('Report not found.');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ message: 'Report deleted.', reportId });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

async function getNotifications(req, res, next) {
  try {
    const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, read: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      const err = new Error('Notification not found.');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ message: 'Notification marked as read.', notification });
  } catch (err) {
    next(err);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
}

async function deleteNotification(req, res, next) {
  try {
    const { notificationId } = req.params;
    await Notification.findOneAndDelete({ _id: notificationId, userId: req.user._id });
    res.json({ message: 'Notification deleted.' });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ */
/* Settings / Profile / Sessions / Activity                            */
/* ------------------------------------------------------------------ */

async function getAdminProfile(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function updateAdminProfile(req, res, next) {
  try {
    const { name, email, phone, avatar, headline, bio } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      return next(err);
    }
    if (name !== undefined) user.name = String(name).trim() || user.name;
    if (email !== undefined) user.email = String(email).trim().toLowerCase();
    if (phone !== undefined) user.phone = String(phone).trim();
    if (avatar !== undefined) user.avatar = String(avatar).trim();
    if (headline !== undefined) user.headline = String(headline).trim();
    if (bio !== undefined) user.bio = String(bio).trim();
    await user.save();
    const clean = user.toJSON();
    delete clean.password;
    res.json({ message: 'Profile updated.', user: clean });
  } catch (err) {
    if (err.code === 11000) {
      const e = new Error('Email already in use.');
      e.statusCode = 409;
      return next(e);
    }
    next(err);
  }
}

async function changeAdminPassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      const err = new Error('New password must be at least 6 characters.');
      err.statusCode = 400;
      return next(err);
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      return next(err);
    }
    const isMatch = await bcrypt.compare(currentPassword || '', user.password);
    if (!isMatch) {
      const err = new Error('Current password is incorrect.');
      err.statusCode = 400;
      return next(err);
    }
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
}

async function getSessions(req, res, next) {
  try {
    const sessions = await Session.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20);
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
}

async function revokeSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOneAndUpdate({ _id: sessionId, userId: req.user._id }, { isActive: false }, { new: true });
    if (!session) {
      const err = new Error('Session not found.');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ message: 'Session revoked.', session });
  } catch (err) {
    next(err);
  }
}

async function getActivityLogs(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
    const total = await ActivityLog.countDocuments();
    res.json({ logs, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ */
/* Global Search                                                       */
/* ------------------------------------------------------------------ */

async function globalSearch(req, res, next) {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ users: [], jobs: [], companies: [], applications: [] });
    }
    const regex = new RegExp(q, 'i');

    const [users, jobs, companies] = await Promise.all([
      User.find({ $or: [{ name: regex }, { email: regex }] }).select('name email avatar role status').limit(10),
      Job.find({ $or: [{ title: regex }, { company: regex }] }).select('title company status jobType').limit(10),
      Company.find({ name: regex }).select('name industry status verificationStatus').limit(10),
    ]);

    const jobIds = jobs.map((j) => j._id);
    const applications = jobIds.length
      ? await Application.find({ jobId: { $in: jobIds } }).populate('jobId', 'title company').populate('candidateId', 'name email').limit(10)
      : [];

    res.json({ users, jobs, companies, applications });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ */
/* Moderation queue (compatibility)                                    */
/* ------------------------------------------------------------------ */

async function getModerationQueue(req, res, next) {
  try {
    const pendingJobs = await Job.find({ status: 'pending' }).populate('recruiterId', 'name email').sort({ createdAt: -1 });
    const pendingReports = await Report.find({ status: 'pending' })
      .populate('reporterId', 'name email')
      .sort({ createdAt: -1 });
    const pendingCompanies = await Company.find({ verificationStatus: 'pending' }).sort({ createdAt: -1 });

    res.json({
      jobs: pendingJobs.map((job) => ({
        _id: job._id,
        title: job.title,
        company: job.company,
        description: job.description,
        submittedBy: job.recruiterId?.name || 'Unknown',
        createdAt: job.createdAt,
      })),
      reports: pendingReports,
      companies: pendingCompanies,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
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
};

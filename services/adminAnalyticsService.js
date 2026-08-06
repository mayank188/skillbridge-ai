const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const TestResult = require('../models/TestResult');
const ProjectSubmission = require('../models/ProjectSubmission');
const Company = require('../models/Company');
const Report = require('../models/Report');

/**
 * Get core platform statistics for the admin dashboard.
 */
async function getPlatformStats() {
  const [
    totalUsers,
    totalCandidates,
    totalRecruiters,
    totalAdmins,
    totalJobs,
    totalApplications,
    totalCompanies,
    pendingReports,
    activeSessions,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'candidate' }),
    User.countDocuments({ role: 'recruiter' }),
    User.countDocuments({ role: 'admin' }),
    Job.countDocuments(),
    Application.countDocuments(),
    Company.countDocuments(),
    Report.countDocuments({ status: 'pending' }),
    require('../models/Session').countDocuments({ isActive: true }),
  ]);

  const testStats = await TestResult.aggregate([
    { $group: { _id: null, avgScore: { $avg: '$score' }, totalTests: { $sum: 1 } } },
  ]);
  const avgTestScore = testStats[0]?.avgScore || 0;
  const totalTests = testStats[0]?.totalTests || 0;

  const projectStats = await ProjectSubmission.aggregate([
    { $group: { _id: null, avgScore: { $avg: '$evaluation.overallScore' }, total: { $sum: 1 } } },
  ]);
  const avgProjectScore = projectStats[0]?.avgScore || 0;
  const totalProjects = projectStats[0]?.total || 0;

  const suspended = await User.countDocuments({ status: 'suspended' });
  const banned = await User.countDocuments({ status: 'banned' });
  const activeJobs = await Job.countDocuments({ status: 'active' });

  return {
    totalUsers,
    totalCandidates,
    totalRecruiters,
    totalAdmins,
    totalJobs,
    activeJobs,
    totalApplications,
    totalCompanies,
    totalTests,
    avgTestScore: Math.round(avgTestScore),
    totalProjects,
    avgProjectScore: Math.round(avgProjectScore),
    pendingReports,
    activeSessions,
    suspendedUsers: suspended,
    bannedUsers: banned,
  };
}

/**
 * Get dashboard analytics (charts, growth, skill distribution, etc.)
 */
async function getDashboardAnalytics() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

  // User growth over last 6 months
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthlyUserGrowth = await User.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Daily users (last 7 days)
  const dailyUsers = await User.aggregate([
    { $match: { createdAt: { $gte: startOfWeek } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ]);

  // Application trends last 6 months
  const appTrends = await Application.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Jobs posted last 6 months
  const jobTrends = await Job.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Skill distribution
  const skillDistribution = await User.aggregate([
    { $match: { role: 'candidate' } },
    { $unwind: '$skills' },
    { $group: { _id: '$skills.category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  // Most demanded skills from jobs
  const demandedSkills = await Job.aggregate([
    { $unwind: '$requiredSkills' },
    { $group: { _id: '$requiredSkills', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  // Top companies
  const topCompanies = await Job.aggregate([
    { $match: { company: { $ne: '' } } },
    { $group: { _id: '$company', jobCount: { $sum: 1 } } },
    { $sort: { jobCount: -1 } },
    { $limit: 10 },
  ]);

  // Top recruiters by jobs posted
  const topRecruiters = await Job.aggregate([
    {
      $group: {
        _id: '$recruiterId',
        jobCount: { $sum: 1 },
      },
    },
    { $sort: { jobCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'recruiter',
      },
    },
    { $unwind: { path: '$recruiter', preserveNullAndEmptyArrays: true } },
  ]);

  // Growth percentages vs last month
  const thisMonthUsers = await User.countDocuments({ createdAt: { $gte: startOfMonth } });
  const lastMonthUsers = await User.countDocuments({ createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd } });
  const thisMonthApps = await Application.countDocuments({ createdAt: { $gte: startOfMonth } });
  const lastMonthApps = await Application.countDocuments({ createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd } });
  const thisMonthJobs = await Job.countDocuments({ createdAt: { $gte: startOfMonth } });
  const lastMonthJobs = await Job.countDocuments({ createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd } });

  const pct = (current, prev) => {
    if (!prev) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 100);
  };

  return {
    monthlyUserGrowth: monthlyUserGrowth.map((d) => ({
      month: `${d._id.month}/${d._id.year}`,
      users: d.count,
    })),
    dailyUsers: dailyUsers.map((d) => ({
      date: `${d._id.month}/${d._id.day}`,
      users: d.count,
    })),
    applicationTrends: appTrends.map((d) => ({
      month: `${d._id.month}/${d._id.year}`,
      applications: d.count,
    })),
    jobTrends: jobTrends.map((d) => ({
      month: `${d._id.month}/${d._id.year}`,
      jobs: d.count,
    })),
    skillDistribution: skillDistribution.map((d) => ({ category: d._id, count: d.count })),
    mostDemandedSkills: demandedSkills.map((d) => ({ skill: d._id, demand: d.count })),
    topCompanies: topCompanies.map((d) => ({ company: d._id, jobs: d.jobCount })),
    topRecruiters: topRecruiters
      .filter((d) => d.recruiter)
      .map((d) => ({
        recruiterId: d._id,
        name: d.recruiter.name,
        jobCount: d.jobCount,
      })),
    growth: {
      users: pct(thisMonthUsers, lastMonthUsers),
      applications: pct(thisMonthApps, lastMonthApps),
      jobs: pct(thisMonthJobs, lastMonthJobs),
    },
  };
}

/**
 * Get recent activity feed (last 20 events across collections).
 */
async function getRecentActivity() {
  const [users, jobs, applications, projects, reports] = await Promise.all([
    User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt'),
    Job.find().sort({ createdAt: -1 }).limit(5).select('title company createdAt status'),
    Application.find().sort({ createdAt: -1 }).limit(5).select('status createdAt'),
    ProjectSubmission.find().sort({ createdAt: -1 }).limit(5).select('projectTitle status createdAt'),
    Report.find().sort({ createdAt: -1 }).limit(5).select('targetType reason status createdAt'),
  ]);

  const events = [
    ...users.map((u) => ({ type: 'user', text: `${u.name} registered as ${u.role}`, time: u.createdAt, id: String(u._id) })),
    ...jobs.map((j) => ({ type: 'job', text: `Job "${j.title}" ${j.status}`, time: j.createdAt, id: String(j._id) })),
    ...applications.map((a) => ({ type: 'application', text: `Application ${a.status}`, time: a.createdAt, id: String(a._id) })),
    ...projects.map((p) => ({ type: 'project', text: `Project "${p.projectTitle}" ${p.status}`, time: p.createdAt, id: String(p._id) })),
    ...reports.map((r) => ({ type: 'report', text: `Report on ${r.targetType}: ${r.status}`, time: r.createdAt, id: String(r._id) })),
  ];

  events.sort((a, b) => new Date(b.time) - new Date(a.time));
  return events.slice(0, 20);
}

module.exports = {
  getPlatformStats,
  getDashboardAnalytics,
  getRecentActivity,
};

const User = require('../models/User');
const TestResult = require('../models/TestResult');
const ProjectSubmission = require('../models/ProjectSubmission');
const Job = require('../models/Job');
const Application = require('../models/Application');
const { extractText } = require('../services/pdfService');
const aiService = require('../services/aiService');
const { getMatchPercentage } = require('../services/matchingService');

/**
 * Get candidate profile and dashboard data
 */
async function getDashboard(req, res, next) {
  try {
    const candidate = await User.findById(req.user._id);
    if (!candidate) {
      const err = new Error('Candidate not found.');
      err.statusCode = 404;
      return next(err);
    }

    const testResults = await TestResult.find({ candidateId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    const projectSubmissions = await ProjectSubmission.find({ candidateId: req.user._id })
      .sort({ createdAt: -1 });

    const latestTest = testResults[0];
    const latestProject = projectSubmissions[0];

    // Calculate skill index
    let skillIndex = 0;
    if (candidate.skills && candidate.skills.length > 0) {
      const avgConfidence = candidate.skills.reduce((sum, s) => sum + (s.confidence || 0), 0) / candidate.skills.length;
      skillIndex = Math.round((avgConfidence * 0.3 + (latestTest?.score || 0) * 0.35 + (latestProject?.evaluation?.overallScore || 0) * 0.35));
    }

    res.json({
      profile: {
        _id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        role: candidate.role,
        createdAt: candidate.createdAt,
      },
      skillIndex,
      skillCount: candidate.skills?.length || 0,
      testScore: candidate.testScore || 0,
      projectScore: candidate.projectScore || 0,
      skills: candidate.skills || [],
      recentTests: testResults.map((t) => ({
        _id: t._id,
        score: t.score,
        duration: t.duration,
        createdAt: t.createdAt,
      })),
      recentProjects: projectSubmissions.map((p) => ({
        _id: p._id,
        projectTitle: p.projectTitle,
        status: p.status,
        evaluation: p.evaluation,
        createdAt: p.createdAt,
      })),
      // application counts for candidate (pending, shortlisted, accepted, rejected)
      applicationCounts: {
        total: await Application.countDocuments({ candidateId: req.user._id }),
        pending: await Application.countDocuments({ candidateId: req.user._id, status: 'pending' }),
        shortlisted: await Application.countDocuments({ candidateId: req.user._id, status: 'shortlisted' }),
        accepted: await Application.countDocuments({ candidateId: req.user._id, status: 'accepted' }),
        rejected: await Application.countDocuments({ candidateId: req.user._id, status: 'rejected' }),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Extract skills from resume
 */
async function extractResumeSkills(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('No file uploaded. Send a PDF using field name "resume".');
      err.statusCode = 400;
      return next(err);
    }

    const { text } = await extractText(req.file.buffer);

    const skills = await aiService.extractSkillsFromResume(text);

    // Save skills to user profile
    const flattenedSkills = [];
    Object.entries(skills).forEach(([category, categorySkills]) => {
      if (Array.isArray(categorySkills)) {
        categorySkills.forEach((skill) => {
          if (typeof skill === 'string') {
            flattenedSkills.push({
              name: skill,
              category,
              confidence: 70, // default
            });
          } else if (skill.name) {
            flattenedSkills.push({
              name: skill.name,
              category,
              confidence: skill.confidence || 70,
            });
          }
        });
      }
    });

    await User.findByIdAndUpdate(req.user._id, { skills: flattenedSkills });

    res.json({
      skills: flattenedSkills,
      message: 'Skills extracted and saved successfully.',
    });
  } catch (err) {
    if (err.statusCode) return next(err);
    const e = new Error(err.message || 'Failed to extract skills.');
    e.statusCode = 400;
    next(e);
  }
}

/**
 * Get job listings with match calculations
 */
async function getJobListings(req, res, next) {
  try {
    const candidate = await User.findById(req.user._id);
    if (!candidate) {
      const err = new Error('Candidate not found.');
      err.statusCode = 404;
      return next(err);
    }

    const jobs = await Job.find({})
      .populate('recruiterId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    const jobsWithMatch = jobs.map((job) => {
      const matchPercentage = getMatchPercentage(
        candidate.skills || [],
        candidate.testScore || 0,
        candidate.projectScore || 0,
        job.requiredSkills || []
      );

      const candidateSkillSet = new Set(
        (candidate.skills || []).map((s) => (s.name || s).toLowerCase())
      );
      const missingSkills = (job.requiredSkills || []).filter(
        (s) => !candidateSkillSet.has(s.toLowerCase())
      );

      return {
        _id: job._id,
        title: job.title,
        description: job.description,
        company: job.company || (job.recruiterId && job.recruiterId.name) || '',
        requiredSkills: job.requiredSkills,
        minimumScore: job.minimumScore,
        location: job.location,
        salary: job.salary,
        jobType: job.jobType,
        recruiter: job.recruiterId,
        matchPercentage,
        missingSkills,
      };
    });

    res.json(jobsWithMatch);
  } catch (err) {
    next(err);
  }
}

/**
 * Apply for a job
 */
async function applyForJob(req, res, next) {
  try {
    const { jobId } = req.body;

    if (!jobId) {
      const err = new Error('Job ID is required.');
      err.statusCode = 400;
      return next(err);
    }

    const job = await Job.findById(jobId);
    if (!job) {
      const err = new Error('Job not found.');
      err.statusCode = 404;
      return next(err);
    }

    // Check if already applied
    const existingApp = await Application.findOne({
      jobId,
      candidateId: req.user._id,
    });

    if (existingApp) {
      const err = new Error('You have already applied for this job.');
      err.statusCode = 409;
      return next(err);
    }

    const application = await Application.create({
      jobId,
      candidateId: req.user._id,
      status: 'pending',
    });

    res.status(201).json({
      message: 'Applied successfully.',
      application,
    });
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

/**
 * Get skill gap analysis for a job
 */
async function getSkillGapAnalysis(req, res, next) {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      const err = new Error('Job not found.');
      err.statusCode = 404;
      return next(err);
    }

    const candidate = await User.findById(req.user._id);
    if (!candidate) {
      const err = new Error('Candidate not found.');
      err.statusCode = 404;
      return next(err);
    }

    const analysis = await aiService.generateSkillGapAnalysis(
      candidate.skills || [],
      job.requiredSkills || []
    );

    res.json(analysis);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
  extractResumeSkills,
  getJobListings,
  applyForJob,
  getSkillGapAnalysis,
  // debug endpoint: return application counts for current candidate
  getApplicationCounts: async function (req, res, next) {
    try {
      const counts = {
        total: await Application.countDocuments({ candidateId: req.user._id }),
        pending: await Application.countDocuments({ candidateId: req.user._id, status: 'pending' }),
        shortlisted: await Application.countDocuments({ candidateId: req.user._id, status: 'shortlisted' }),
        accepted: await Application.countDocuments({ candidateId: req.user._id, status: 'accepted' }),
        rejected: await Application.countDocuments({ candidateId: req.user._id, status: 'rejected' }),
      };
      res.json(counts);
    } catch (err) {
      next(err);
    }
  },
  // debug: return recent applications for this candidate (helpful to inspect statuses)
  getRecentApplications: async function (req, res, next) {
    try {
      const apps = await Application.find({ candidateId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('jobId', 'title');
      res.json(apps);
    } catch (err) {
      next(err);
    }
  },
};

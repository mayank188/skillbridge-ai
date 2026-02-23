const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');
const { getMatchPercentage } = require('../services/matchingService');
const TestResult = require('../models/TestResult');

function toSafeUser(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  delete o.password;
  return o;
}

async function createJob(req, res, next) {
  try {
    const { title, description, requiredSkills, minimumScore, location, salary, jobType, company } = req.body;
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
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
      minimumScore: Number(minimumScore) || 0,
      location: (location ?? '').trim(),
      salary: (salary ?? '').trim(),
      jobType,
    });
    res.status(201).json(job);
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

async function getMyJobs(req, res, next) {
  try {
    const jobs = await Job.find({ recruiterId: req.user._id }).sort({ createdAt: -1 });

    // Attach applicant counts for each job
    const jobsWithCounts = await Promise.all(
      jobs.map(async (j) => {
        const count = await Application.countDocuments({ jobId: j._id });
        return { ...j.toObject(), applicantCount: count };
      })
    );

    res.json(jobsWithCounts);
  } catch (err) {
    next(err);
  }
}

async function getCandidatesForJob(req, res, next) {
  try {
    const job = await Job.findOne({ _id: req.params.id, recruiterId: req.user._id });
    if (!job) {
      const err = new Error('Job not found.');
      err.statusCode = 404;
      return next(err);
    }
    const candidates = await User.find({ role: 'candidate' }).select('-password');
    const shortlistedIds = new Set(
      (await Application.find({ jobId: job._id }).distinct('candidateId')).map((id) => id.toString())
    );
    const requiredSkills = job.requiredSkills || [];

    const list = await Promise.all(
      candidates.map(async (c) => {
        // fetch latest test result for candidate
        const latestTest = await TestResult.findOne({ candidateId: c._id }).sort({ createdAt: -1 }).lean();

        // compute difficulty counts from responses if available
        const difficultyCounts = { beginner: 0, intermediate: 0, advanced: 0 };
        if (latestTest && Array.isArray(latestTest.responses)) {
          latestTest.responses.forEach((r) => {
            const d = (r.difficulty || 'intermediate').toLowerCase();
            if (d === 'beginner' || d === 'intermediate' || d === 'advanced') difficultyCounts[d] += 1;
          });
        }

        // If responses did not include per-question difficulty (older records),
        // but the test has a top-level difficulty and totalQuestions, use that
        // to populate counts so the recruiter UI shows answers correctly.
        const totalCount = difficultyCounts.beginner + difficultyCounts.intermediate + difficultyCounts.advanced;
        if (latestTest && totalCount === 0 && (latestTest.totalQuestions || 0) > 0) {
          const topD = (latestTest.difficulty || 'intermediate').toLowerCase();
          if (topD === 'beginner' || topD === 'intermediate' || topD === 'advanced') {
            difficultyCounts[topD] = latestTest.totalQuestions;
          }
        }

        const testScore = latestTest?.score ?? c.testScore ?? 0;
        const matchPercentage = getMatchPercentage(c.skills || [], testScore, c.projectScore ?? 0, requiredSkills);

        const latestSummary = latestTest
          ? {
              score: latestTest.score,
              totalQuestions: latestTest.totalQuestions,
              correctAnswers: latestTest.correctAnswers,
              difficulty: latestTest.difficulty || null,
              difficultyCounts,
              createdAt: latestTest.createdAt,
            }
          : null;

        return {
          candidate: toSafeUser(c),
          matchPercentage,
          shortlisted: shortlistedIds.has(c._id.toString()),
          latestTest: latestSummary,
        };
      })
    );
    // Sort candidates first by difficulty level (advanced > intermediate > beginner > no test),
    // then by test score (descending). If test score is missing, fall back to matchPercentage.
    const levelRank = (lvl) => {
      if (!lvl) return 0;
      const s = String(lvl).toLowerCase();
      if (s === 'advanced') return 3;
      if (s === 'intermediate') return 2;
      if (s === 'beginner') return 1;
      return 0;
    };

    list.sort((a, b) => {
      const aLevel = levelRank(a.latestTest?.difficulty);
      const bLevel = levelRank(b.latestTest?.difficulty);
      if (aLevel !== bLevel) return bLevel - aLevel; // higher level first

      const aScore = a.latestTest?.score ?? a.matchPercentage ?? 0;
      const bScore = b.latestTest?.score ?? b.matchPercentage ?? 0;
      return bScore - aScore; // higher score first
    });
    res.json({ job: { _id: job._id, title: job.title, requiredSkills }, candidates: list });
  } catch (err) {
    next(err);
  }
}

async function shortlistCandidate(req, res, next) {
  try {
    const job = await Job.findOne({ _id: req.params.id, recruiterId: req.user._id });
    if (!job) {
      const err = new Error('Job not found.');
      err.statusCode = 404;
      return next(err);
    }
    const { candidateId } = req.body;
    if (!candidateId) {
      const err = new Error('candidateId is required.');
      err.statusCode = 400;
      return next(err);
    }
    const candidate = await User.findById(candidateId);
    if (!candidate || candidate.role !== 'candidate') {
      const err = new Error('Candidate not found.');
      err.statusCode = 404;
      return next(err);
    }
    const app = await Application.findOneAndUpdate(
      { jobId: job._id, candidateId: candidate._id },
      { $set: { status: 'shortlisted' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ shortlisted: true, application: app });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createJob,
  getMyJobs,
  getCandidatesForJob,
  shortlistCandidate,
};

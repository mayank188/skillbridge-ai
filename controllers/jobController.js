const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');
const { getMatchPercentage } = require('../services/matchingService');
const TestResult = require('../models/TestResult');
const ProjectSubmission = require('../models/ProjectSubmission');

function toSafeUser(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  delete o.password;
  return o;
}

async function createJob(req, res, next) {
  try {
    const { title, description, requiredSkills, minimumScore, location, salary, jobType, company, status } = req.body;
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
      status: status || 'active',
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
    const filter = req.user.role === 'admin' ? {} : { recruiterId: req.user._id };
    const jobs = await Job.find(filter).sort({ createdAt: -1 });

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
    const job = await Job.findOne(
      req.user.role === 'admin'
        ? { _id: req.params.id }
        : { _id: req.params.id, recruiterId: req.user._id }
    );
    if (!job) {
      const err = new Error('Job not found.');
      err.statusCode = 404;
      return next(err);
    }

const applications = await Application.find({ jobId: job._id, status: { $ne: 'rejected' } })
      .populate({ path: 'candidateId', select: '-password' })
      .sort({ createdAt: -1 })
      .lean();

    const requiredSkills = job.requiredSkills || [];

    const uniqueByCandidate = new Map();
    for (const application of applications) {
      const candidate = application.candidateId;
      if (!candidate || !candidate._id) continue;
      const key = candidate._id.toString();
      if (!uniqueByCandidate.has(key)) {
        uniqueByCandidate.set(key, application);
      }
    }

    const list = (
      await Promise.all(
        Array.from(uniqueByCandidate.values()).map(async (application) => {
          const candidate = application.candidateId;
          if (!candidate || candidate.role !== 'candidate') return null;

          const latestTest = await TestResult.findOne({
            candidateId: candidate._id,
          })
            .sort({ createdAt: -1 })
            .lean();

          const difficultyCounts = { beginner: 0, intermediate: 0, advanced: 0 };
          if (latestTest && Array.isArray(latestTest.responses)) {
            latestTest.responses.forEach((r) => {
              const d = (r.difficulty || 'intermediate').toLowerCase();
              if (d === 'beginner' || d === 'intermediate' || d === 'advanced') difficultyCounts[d] += 1;
            });
          }

          const totalCount =
            difficultyCounts.beginner + difficultyCounts.intermediate + difficultyCounts.advanced;
          if (latestTest && totalCount === 0 && (latestTest.totalQuestions || 0) > 0) {
            const topD = (latestTest.difficulty || 'intermediate').toLowerCase();
            if (topD === 'beginner' || topD === 'intermediate' || topD === 'advanced') {
              difficultyCounts[topD] = latestTest.totalQuestions;
            }
          }

          const testScore = latestTest?.score ?? candidate.testScore ?? 0;
          const matchPercentage = getMatchPercentage(
            candidate.skills || [],
            testScore,
            candidate.projectScore ?? 0,
            requiredSkills
          );

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

const appStatus = application.status || 'pending';

          // Include the candidate's latest project evaluation (auto GitHub analysis).
          const latestProject = await ProjectSubmission.findOne({
            candidateId: candidate._id,
            status: 'evaluated',
          })
            .sort({ createdAt: -1 })
            .lean();

          const projectSummary = latestProject
            ? {
                projectId: latestProject._id,
                projectTitle: latestProject.projectTitle,
                githubLink: latestProject.githubLink,
                overallScore: latestProject.evaluation?.overallScore ?? null,
                codeQualityScore: latestProject.evaluation?.codeQualityScore ?? null,
                architectureScore: latestProject.evaluation?.architectureScore ?? null,
                documentationScore: latestProject.evaluation?.documentationScore ?? null,
                bestPracticesScore: latestProject.evaluation?.bestPracticesScore ?? null,
                feedback: latestProject.evaluation?.feedback ?? '',
                strengths: latestProject.evaluation?.strengths ?? [],
                improvements: latestProject.evaluation?.improvements ?? [],
                structureSummary: latestProject.evaluation?.structureSummary ?? null,
                source: latestProject.evaluation?.source ?? null,
                evaluatedAt: latestProject.evaluation?.evaluatedAt ?? null,
              }
            : null;

          return {
            candidate: toSafeUser(candidate),
            applicationId: application._id,
            status: appStatus,
            appliedAt: application.createdAt,
            matchPercentage,
            latestTest: latestSummary,
            latestProject: projectSummary,
          };
        })
      )
    );

    list.sort((a, b) => {
      const aLevel = a.latestTest
        ? a.latestTest.difficulty === 'advanced'
          ? 3
          : a.latestTest.difficulty === 'intermediate'
          ? 2
          : a.latestTest.difficulty === 'beginner'
          ? 1
          : 0
        : 0;
      const bLevel = b.latestTest
        ? b.latestTest.difficulty === 'advanced'
          ? 3
          : b.latestTest.difficulty === 'intermediate'
          ? 2
          : b.latestTest.difficulty === 'beginner'
          ? 1
          : 0
        : 0;
      if (aLevel !== bLevel) return bLevel - aLevel;
      return (b.latestTest?.score ?? b.matchPercentage ?? 0) - (a.latestTest?.score ?? a.matchPercentage ?? 0);
    });

    res.json({ job: { _id: job._id, title: job.title, requiredSkills }, candidates: list });
  } catch (err) {
    next(err);
  }
}

async function shortlistCandidate(req, res, next) {
  try {
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, recruiterId: req.user._id };
    const job = await Job.findOne(filter);
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
    const app = await Application.findOne({ jobId: job._id, candidateId: candidate._id });
    if (!app) {
      const err = new Error('Candidate has not applied for this job.');
      err.statusCode = 404;
      return next(err);
    }
    app.status = 'shortlisted';
    await app.save();
    res.status(201).json({ shortlisted: true, application: app });
  } catch (err) {
    next(err);
  }
}

async function rejectCandidate(req, res, next) {
  try {
    const job = await Job.findById(req.params.id);
    if (!job || (req.user.role !== 'admin' && job.recruiterId.toString() !== req.user._id.toString())) {
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
    const app = await Application.findOne({ jobId: job._id, candidateId: candidate._id });
    if (!app) {
      const err = new Error('Candidate has not applied for this job.');
      err.statusCode = 404;
      return next(err);
    }
    app.status = 'rejected';
    await app.save();
    res.status(201).json({ rejected: true, application: app });
  } catch (err) {
    next(err);
  }
}

async function updateJob(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, requiredSkills, minimumScore, location, salary, jobType, company, status } = req.body;

    const job = await Job.findById(id);
    if (!job || (req.user.role !== 'admin' && job.recruiterId.toString() !== req.user._id.toString())) {
      const err = new Error('Job not found.');
      err.statusCode = 404;
      return next(err);
    }

    job.title = title?.trim() ?? job.title;
    job.description = description?.trim() ?? job.description;
    job.company = company?.trim() ?? job.company;
    job.requiredSkills = Array.isArray(requiredSkills)
      ? requiredSkills.map((s) => String(s).trim()).filter(Boolean)
      : job.requiredSkills;
    job.minimumScore = Number(minimumScore) || job.minimumScore;
    job.location = location?.trim() ?? job.location;
    job.salary = salary?.trim() ?? job.salary;
    job.jobType = jobType ?? job.jobType;
    if (typeof status === 'string' && status) {
      job.status = status;
    }

    await job.save();
    res.json(job);
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
    const { id } = req.params;
    const filter = req.user.role === 'admin'
      ? { _id: id }
      : { _id: id, recruiterId: req.user._id };
    const job = await Job.findOne(filter);
    if (!job) {
      const err = new Error('Job not found.');
      err.statusCode = 404;
      return next(err);
    }
    await job.deleteOne();
    await Application.deleteMany({ jobId: job._id });
    res.json({ message: 'Job deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createJob,
  getMyJobs,
  getCandidatesForJob,
  shortlistCandidate,
  rejectCandidate,
  updateJob,
  deleteJob,
};

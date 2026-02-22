const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');
const { getMatchPercentage } = require('../services/matchingService');

function toSafeUser(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  delete o.password;
  return o;
}

async function createJob(req, res, next) {
  try {
    const { title, description, requiredSkills, minimumScore, location, salary, jobType } = req.body;
    if (!title?.trim() || !description?.trim() || !jobType) {
      const err = new Error('Title, description, and job type are required.');
      err.statusCode = 400;
      return next(err);
    }
    const job = await Job.create({
      recruiterId: req.user._id,
      title: title.trim(),
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
    res.json(jobs);
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
    const list = candidates.map((c) => {
      const matchPercentage = getMatchPercentage(
        c.skills || [],
        c.testScore ?? 0,
        c.projectScore ?? 0,
        requiredSkills
      );
      return {
        candidate: toSafeUser(c),
        matchPercentage,
        shortlisted: shortlistedIds.has(c._id.toString()),
      };
    });
    list.sort((a, b) => b.matchPercentage - a.matchPercentage);
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
    await Application.findOneAndUpdate(
      { jobId: job._id, candidateId: candidate._id },
      { $set: { status: 'shortlisted' } },
      { upsert: true, new: true }
    );
    res.status(201).json({ shortlisted: true });
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

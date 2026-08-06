const User = require('../models/User');
const ProjectSubmission = require('../models/ProjectSubmission');
const aiService = require('../services/aiService');
const { analyzeGithubRepo } = require('../services/githubService');

/**
 * Generate a project assignment based on candidate skills
 */
const DEFAULT_SKILLS = ['javascript', 'react', 'nodejs', 'html', 'css', 'python', 'sql', 'git'];

async function generateProjectAssignment(req, res, next) {
  try {
    const { difficulty = 'intermediate', skills: requestSkills } = req.body;
    console.log('generateProjectAssignment request:', {
      userId: req.user?._id,
      difficulty,
      requestSkillsLength: Array.isArray(requestSkills) ? requestSkills.length : null,
      requestSkillsSample: Array.isArray(requestSkills) ? requestSkills.slice(0, 3) : requestSkills,
    });

    const candidate = await User.findById(req.user._id);
    if (!candidate) {
      const err = new Error('Candidate not found.');
      err.statusCode = 404;
      return next(err);
    }

    // Determine skills: prefer request body, then candidate.skills, then defaults.
    let skills = [];
    if (Array.isArray(requestSkills) && requestSkills.length > 0) {
      skills = requestSkills.map((s) => (typeof s === 'string' ? { name: s } : s));
    } else if (Array.isArray(candidate.skills) && candidate.skills.length > 0) {
      skills = candidate.skills;
    } else {
      skills = DEFAULT_SKILLS.map((name) => ({ name }));
    }

    console.log(`Generate project for user=${req.user._id}, skills=${skills.length}, difficulty=${difficulty}`);

    // Limit to a reasonable number for generation.
    skills = skills.slice(0, 5);

    const project = await aiService.generateProject(skills, difficulty);

    if (!project || !project.title) {
      const err = new Error('Failed to generate a project. Please try again.');
      err.statusCode = 500;
      return next(err);
    }

    // Create project submission record
    const projectSubmission = await ProjectSubmission.create({
      candidateId: req.user._id,
      projectTitle: project.title,
      projectDescription: project.description,
      requirements: project.requirements || [],
      deliverables: project.deliverables || [],
      difficulty,
      generatedAt: new Date(),
      status: 'assigned',
    });

    res.status(201).json({
      projectId: projectSubmission._id,
      projectTitle: project.title,
      projectDescription: project.description,
      requirements: project.requirements || [],
      deliverables: project.deliverables || [],
      estimatedHours: project.estimatedHours,
      difficulty,
      message: 'Project assigned successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Submit project for evaluation — automatically analyzes the GitHub repo.
 */
async function submitProject(req, res, next) {
  try {
    const { projectId, githubLink, description } = req.body;

    if (!projectId || !githubLink) {
      const err = new Error('Project ID and GitHub link are required.');
      err.statusCode = 400;
      return next(err);
    }

    const project = await ProjectSubmission.findOne({
      _id: projectId,
      candidateId: req.user._id,
    });

    if (!project) {
      const err = new Error('Project not found.');
      err.statusCode = 404;
      return next(err);
    }

    if (project.status === 'evaluated') {
      const err = new Error('This project has already been evaluated.');
      err.statusCode = 409;
      return next(err);
    }

    // Update submission with GitHub link and optional description
    project.githubLink = githubLink;
    if (description) project.projectDescription = description;
    project.submittedAt = new Date();
    project.status = 'submitted';
    await project.save();

    // Automatically analyze the GitHub repository (structure + code quality).
    const repoAnalysis = await analyzeGithubRepo(githubLink);

    if (repoAnalysis.ok) {
      const evaluation = await aiService.analyzeGithubRepo(repoAnalysis, project.projectDescription);

      const overallScore = Math.round(
        (evaluation.codeQualityScore +
          evaluation.architectureScore +
          evaluation.documentationScore +
          evaluation.bestPracticesScore) / 4
      );

      project.evaluation = {
        codeQualityScore: evaluation.codeQualityScore,
        architectureScore: evaluation.architectureScore,
        documentationScore: evaluation.documentationScore,
        bestPracticesScore: evaluation.bestPracticesScore,
        completionScore: evaluation.completionScore ?? overallScore,
        overallScore,
        feedback: evaluation.feedback,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        structureSummary: evaluation.structureSummary,
        source: evaluation.source || 'ai',
        evaluatedAt: new Date(),
      };
      project.status = 'evaluated';
      await project.save();

      // Update user project score if higher
      const candidate = await User.findById(req.user._id);
      if (overallScore > (candidate.projectScore || 0)) {
        await User.findByIdAndUpdate(req.user._id, { projectScore: overallScore });
      }

      res.json({
        projectId: project._id,
        evaluation: project.evaluation,
        status: 'evaluated',
        message: 'Project submitted and analyzed successfully.',
      });
    } else {
      // Repo could not be fetched (e.g., private/missing). Submission is saved but pending analysis.
      project.evaluation = {
        source: 'pending',
        feedback: repoAnalysis.error || 'Repository could not be analyzed automatically.',
        evaluatedAt: new Date(),
      };
      await project.save();

      res.status(201).json({
        projectId: project._id,
        status: 'submitted',
        message: 'Project submitted, but the repository could not be analyzed automatically. Please make your repo public or check the URL.',
        evaluation: project.evaluation,
      });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * Evaluate submitted project using AI
 */
async function evaluateProject(req, res, next) {
  try {
    const { projectId } = req.params;
    const { code } = req.body;

    const project = await ProjectSubmission.findOne({
      _id: projectId,
      candidateId: req.user._id,
    });

    if (!project) {
      const err = new Error('Project not found.');
      err.statusCode = 404;
      return next(err);
    }

    if (project.status !== 'submitted') {
      const err = new Error('Project must be submitted before evaluation.');
      err.statusCode = 400;
      return next(err);
    }

    // Use the actual code submitted by the candidate for analysis.
    const submittedCode = String(code || '').trim().slice(0, 5000);

    const evaluation = await aiService.evaluateProject(
      project.projectDescription,
      project.githubLink,
      submittedCode
    );

    // Calculate overall score
    const overallScore = Math.round(
      (evaluation.codeQualityScore + evaluation.architectureScore + evaluation.completionScore) / 3
    );

    // Update project with evaluation
    project.evaluation = {
      codeQualityScore: evaluation.codeQualityScore,
      architectureScore: evaluation.architectureScore,
      completionScore: evaluation.completionScore,
      overallScore,
      feedback: evaluation.feedback,
      evaluatedAt: new Date(),
    };
    project.status = 'evaluated';
    await project.save();

    // Update user project score if higher
    const candidate = await User.findById(req.user._id);
    if (overallScore > (candidate.projectScore || 0)) {
      await User.findByIdAndUpdate(req.user._id, { projectScore: overallScore });
    }

    res.json({
      projectId: project._id,
      evaluation: project.evaluation,
      message: 'Project evaluated successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get project history
 */
async function getProjectHistory(req, res, next) {
  try {
    const projects = await ProjectSubmission.find({ candidateId: req.user._id })
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (err) {
    next(err);
  }
}

/**
 * Get single project details
 */
async function getProjectDetails(req, res, next) {
  try {
    const { projectId } = req.params;

    const project = await ProjectSubmission.findOne({
      _id: projectId,
      candidateId: req.user._id,
    });

    if (!project) {
      const err = new Error('Project not found.');
      err.statusCode = 404;
      return next(err);
    }

    res.json(project);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateProjectAssignment,
  submitProject,
  evaluateProject,
  getProjectHistory,
  getProjectDetails,
};

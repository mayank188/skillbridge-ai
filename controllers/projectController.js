const User = require('../models/User');
const ProjectSubmission = require('../models/ProjectSubmission');
const aiService = require('../services/aiService');

/**
 * Generate a project assignment based on candidate skills
 */
async function generateProjectAssignment(req, res, next) {
  try {
    const { difficulty = 'intermediate' } = req.body;

    const candidate = await User.findById(req.user._id);
    if (!candidate) {
      const err = new Error('Candidate not found.');
      err.statusCode = 404;
      return next(err);
    }

    if (!candidate.skills || candidate.skills.length === 0) {
      const err = new Error('Please upload resume and extract skills first.');
      err.statusCode = 400;
      return next(err);
    }

    // Get skills for project generation
    const skills = candidate.skills.slice(0, 5);

    const project = await aiService.generateProject(skills, difficulty);

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
 * Submit project for evaluation
 */
async function submitProject(req, res, next) {
  try {
    const { projectId, githubLink } = req.body;

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

    // Update submission with GitHub link
    project.githubLink = githubLink;
    project.submittedAt = new Date();
    project.status = 'submitted';
    await project.save();

    res.json({
      projectId: project._id,
      message: 'Project submitted successfully. Evaluation in progress...',
      status: 'submitted',
    });
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

    // Simulate getting code from GitHub (in production, would fetch real code)
    const mockCode = `// Sample code from ${project.githubLink}\n// This is a placeholder for actual code evaluation`;

    const evaluation = await aiService.evaluateProject(
      project.projectDescription,
      project.githubLink,
      mockCode
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

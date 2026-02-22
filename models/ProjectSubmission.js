const mongoose = require('mongoose');

const projectSubmissionSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    projectTitle: {
      type: String,
      required: true,
      trim: true,
    },
    projectDescription: {
      type: String,
      required: true,
      trim: true,
    },
    requirements: [String],
    deliverables: [String],
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate',
    },
    generatedAt: Date,
    submittedAt: Date,
    githubLink: {
      type: String,
      trim: true,
    },
    evaluation: {
      codeQualityScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      architectureScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      completionScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      overallScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      feedback: String,
      evaluatedAt: Date,
    },
    status: {
      type: String,
      enum: ['assigned', 'submitted', 'evaluated'],
      default: 'assigned',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false, versionKey: false }
);

const ProjectSubmission = mongoose.model('ProjectSubmission', projectSubmissionSchema);

module.exports = ProjectSubmission;

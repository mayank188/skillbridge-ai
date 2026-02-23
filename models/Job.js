const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recruiter is required'],
    },
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    company: {
      type: String,
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters'],
      default: '',
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
    },
    requiredSkills: {
      type: [String],
      default: [],
      validate: {
        validator(v) {
          return v.length <= 30;
        },
        message: 'Cannot have more than 30 required skills',
      },
    },
    minimumScore: {
      type: Number,
      default: 0,
      min: [0, 'Minimum score cannot be negative'],
      max: [100, 'Minimum score cannot exceed 100'],
    },
    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters'],
      default: '',
    },
    salary: {
      type: String,
      trim: true,
      maxlength: [100, 'Salary cannot exceed 100 characters'],
      default: '',
    },
    jobType: {
      type: String,
      required: [true, 'Job type is required'],
      enum: {
        values: ['full-time', 'part-time', 'contract', 'internship', 'freelance'],
        message: 'Job type must be full-time, part-time, contract, internship, or freelance',
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

jobSchema.index({ recruiterId: 1 });
jobSchema.index({ jobType: 1 });
jobSchema.index({ createdAt: -1 });

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;

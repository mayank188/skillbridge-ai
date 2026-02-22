const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
      maxlength: [100, 'Skill name cannot exceed 100 characters'],
    },
    category: {
      type: String,
      required: [true, 'Skill category is required'],
      trim: true,
      maxlength: [80, 'Category cannot exceed 80 characters'],
    },
    confidence: {
      type: Number,
      required: [true, 'Confidence level is required'],
      min: [0, 'Confidence must be between 0 and 100'],
      max: [100, 'Confidence must be between 0 and 100'],
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[\w.-]+@[\w.-]+\.\w+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ['candidate', 'recruiter', 'admin'],
        message: 'Role must be candidate, recruiter, or admin',
      },
    },
    skills: {
      type: [skillSchema],
      default: [],
      validate: {
        validator(v) {
          return v.length <= 50;
        },
        message: 'Cannot have more than 50 skills',
      },
    },
    testScore: {
      type: Number,
      default: 0,
      min: [0, 'Test score cannot be negative'],
      max: [100, 'Test score cannot exceed 100'],
    },
    projectScore: {
      type: Number,
      default: 0,
      min: [0, 'Project score cannot be negative'],
      max: [100, 'Project score cannot exceed 100'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    versionKey: false,
    toJSON: { virtuals: false, transform: (doc, ret) => { delete ret.password; return ret; } },
    toObject: { virtuals: false },

  }
);

// unique: true on email already creates a unique index; avoid duplicate
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;

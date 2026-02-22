const mongoose = require('mongoose');

const questionResponseSchema = new mongoose.Schema(
  {
    questionId: String,
    question: String,
    skill: String,
    difficulty: String,
    userAnswer: String,
    correctAnswer: String,
    isCorrect: Boolean,
    timeSpent: Number, // seconds
  },
  { _id: false }
);

const testResultSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    correctAnswers: {
      type: Number,
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    duration: {
      type: Number,
      required: true, // seconds
    },
    skillBreakdown: [
      {
        skill: String,
        total: Number,
        correct: Number,
        percentage: Number,
      },
    ],
    responses: [questionResponseSchema],
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false, versionKey: false }
);

const TestResult = mongoose.model('TestResult', testResultSchema);

module.exports = TestResult;

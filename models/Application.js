const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'shortlisted', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true, versionKey: false }
);

applicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;

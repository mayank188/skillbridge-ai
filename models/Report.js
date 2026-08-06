const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ['user', 'job', 'company'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'targetModel',
    },
    targetModel: {
      type: String,
      required: true,
      enum: ['User', 'Job', 'Company'],
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reason: {
      type: String,
      trim: true,
      required: [true, 'Report reason is required'],
    },
    details: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'dismissed', 'action_taken'],
      default: 'pending',
    },
    adminNote: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false, versionKey: false }
);

reportSchema.index({ status: 1 });
reportSchema.index({ targetType: 1 });
reportSchema.index({ createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;

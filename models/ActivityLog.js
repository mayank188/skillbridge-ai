const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actor: {
      type: String,
      trim: true,
      default: '',
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    targetType: {
      type: String,
      trim: true,
      default: '',
    },
    targetId: {
      type: String,
      default: '',
    },
    details: {
      type: String,
      default: '',
    },
    ip: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false, versionKey: false }
);

activityLogSchema.index({ userId: 1 });
activityLogSchema.index({ createdAt: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;

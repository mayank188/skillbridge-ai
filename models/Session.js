const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
    },
    device: {
      type: String,
      default: '',
    },
    ip: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: false, versionKey: false }
);

sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ expiresAt: 1 });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;

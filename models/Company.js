const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters'],
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    logo: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    industry: {
      type: String,
      trim: true,
      default: '',
    },
    size: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    documents: [
      {
        name: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false, versionKey: false }
);

companySchema.index({ name: 1 });
companySchema.index({ status: 1 });
companySchema.index({ verificationStatus: 1 });

const Company = mongoose.model('Company', companySchema);

module.exports = Company;

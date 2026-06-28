'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const ActivityLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'profile_updated',
        'password_changed',
        'extension_installed',
        'settings_changed',
        'simplification_completed',
        'account_created'
      ],
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Compound index for querying recent activity by user
ActivityLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);

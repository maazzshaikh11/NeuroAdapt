'use strict';

/**
 * Profile Controller — NeuroAdapt Backend
 *
 * Handles GET and PUT /api/profile.
 * Both routes are protected — req.user is always a full Mongoose User doc
 * attached by auth.middleware.js before this controller runs.
 *
 * Security rule: userId is NEVER read from req.body.
 * Identity always comes from req.user._id (set by JWT middleware).
 */

const User = require('../models/User.model');
const ActivityLog = require('../models/ActivityLog.model');
const path = require('path');
const fs = require('fs');

// ─── Allowed preference keys and their validators ─────────────────────────────
// Centralised here so validation stays in sync with the User model.
// Each entry: { validate: (value) => boolean }
const PREFERENCE_VALIDATORS = {
  simplificationLevel: {
    validate: (v) => ['basic', 'standard', 'academic'].includes(v),
  },
  fontFamily: {
    validate: (v) => ['default', 'openDyslexic'].includes(v),
  },
  colorTheme: {
    validate: (v) => ['light', 'dark', 'yellow', 'cream'].includes(v),
  },
  fontSize: {
    validate: (v) => typeof v === 'number' && v >= 12 && v <= 28,
  },
  lineSpacing: {
    validate: (v) => typeof v === 'number' && v >= 1.0 && v <= 2.5,
  },
  bionicModeEnabled: {
    validate: (v) => typeof v === 'boolean',
  },
  focusModeEnabled: {
    validate: (v) => typeof v === 'boolean',
  },
};

// Fields that can be updated through the profile endpoint.
const ALLOWED_UPDATE_FIELDS = new Set([
  'displayName',
  'fullName',
  'username',
  'bio',
  'phone',
  'occupation',
  'email',
  'preferences',
]);

// Fields that can NEVER be updated through the profile endpoint.
const IMMUTABLE_FIELDS = new Set([
  'passwordHash',
  'profileType',
  'totalSimplifications',
]);

// ─── GET /api/profile ─────────────────────────────────────────────────────────

/**
 * Returns the authenticated user's profile.
 *
 * Identity comes exclusively from req.user._id (set by authenticate middleware).
 * passwordHash and __v are stripped by .select() — the toJSON transform on the
 * User model strips them again as a second line of defence.
 *
 * @type {import('express').RequestHandler}
 */
async function getProfile(req, res, next) {
  try {
    // Re-fetch from DB to guarantee freshness (a concurrent PUT may have
    // updated preferences since the JWT middleware loaded the doc).
    const user = await User
      .findById(req.user._id)
      .select('-passwordHash -__v');

    if (!user) {
      return res.status(401).json({
        success: false,
        code:    'USER_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      user:    user.toJSON(), // Use toJSON to strip sensitive fields
    });

  } catch (err) {
    return next(err);
  }
}

// ─── PUT /api/profile ─────────────────────────────────────────────────────────

/**
 * Updates the authenticated user's profile information.
 *
 * Accepts `displayName`, `email`, and `preferences`.
 * Any attempt to update identity or immutable fields returns 400.
 *
 * Validation is performed manually before the DB write to provide
 * specific error codes rather than raw Mongoose errors.
 *
 * @type {import('express').RequestHandler}
 */
async function updateProfile(req, res, next) {
  try {
    const body = req.body;

    // ── Guard 1: Body must only contain allowed fields ──────────────────────
    const topLevelKeys = Object.keys(body || {});
    const forbiddenKeys = topLevelKeys.filter(
      (key) => !ALLOWED_UPDATE_FIELDS.has(key)
    );

    if (forbiddenKeys.length > 0) {
      console.log("PUT /api/profile 400 ERROR: forbiddenKeys", { reqBody: body, forbiddenKeys });
      return res.status(400).json({
        success: false,
        code:    'INVALID_FIELD',
        message: `These fields cannot be updated via this endpoint: ${forbiddenKeys.join(', ')}`,
      });
    }

    const { displayName, email, preferences: incomingPrefs } = body;
    const updatePayload = {};

    // ── Guard 2: Validate displayName if provided ────────────────────────────
    if (displayName !== undefined) {
      if (typeof displayName !== 'string' || displayName.length > 50) {
        return res.status(400).json({
          success: false,
          code:    'INVALID_DISPLAY_NAME',
          message: 'Display name must be a string up to 50 characters.',
        });
      }
      updatePayload.displayName = displayName;
    }

    // ── Validation for new fields ──────────────────────────────────────────
    if (body.fullName !== undefined) {
      if (typeof body.fullName !== 'string') {
        return res.status(400).json({ success: false, code: 'INVALID_FULL_NAME', message: 'fullName must be a string.' });
      }
      const trimmed = body.fullName.trim();
      if (trimmed && (trimmed.length < 2 || trimmed.length > 50)) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_FULL_NAME',
          message: 'Full name must be 2–50 characters.',
        });
      }
      updatePayload.fullName = trimmed;
    }

    const stringFields = ['bio', 'phone', 'occupation'];
    for (const field of stringFields) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== 'string') {
          return res.status(400).json({ success: false, message: `${field} must be a string.` });
        }
        updatePayload[field] = body[field];
      }
    }

    if (body.username !== undefined) {
      if (typeof body.username !== 'string' || body.username.length < 3 || body.username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(body.username)) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_USERNAME',
          message: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.'
        });
      }
      
      const existingUser = await User.findOne({ username: body.username, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(409).json({ success: false, code: 'USERNAME_TAKEN', message: 'Username is already taken.' });
      }
      updatePayload.username = body.username;
    }

    // ── Guard 3: Validate email if provided ────────────────────────────────
    if (email !== undefined) {
      // Basic email format validation
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.log("PUT /api/profile 400 ERROR: INVALID_EMAIL_FORMAT", { reqBody: body, email });
        return res.status(400).json({
          success: false,
          code:    'INVALID_EMAIL_FORMAT',
          message: 'Please provide a valid email address.',
        });
      }
      // Check if email is already in use by another user
      const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          code:    'EMAIL_ALREADY_IN_USE',
          message: 'This email address is already associated with another account.',
        });
      }
      updatePayload.email = email;
    }

    // ── Guard 4: Validate preferences if provided ──────────────────────────
    if (incomingPrefs !== undefined) {
      if (typeof incomingPrefs !== 'object' || Array.isArray(incomingPrefs) || incomingPrefs === null) {
        console.log("PUT /api/profile 400 ERROR: INVALID_PREFERENCE_PAYLOAD", { reqBody: body, incomingPrefs });
        return res.status(400).json({
          success: false,
          code:    'INVALID_PREFERENCE_PAYLOAD',
          message: '`preferences` must be a plain object.',
        });
      }

      // Validate each preference key/value
      for (const [key, value] of Object.entries(incomingPrefs)) {
        if (IMMUTABLE_FIELDS.has(key)) {
          console.log("PUT /api/profile 400 ERROR: IMMUTABLE_FIELD", { reqBody: body, key });
          return res.status(400).json({
            success: false,
            code:    'IMMUTABLE_FIELD',
            message: `${key} cannot be updated.`,
          });
        }

        if (!PREFERENCE_VALIDATORS[key]) {
          console.log("PUT /api/profile 400 ERROR: UNKNOWN_PREFERENCE_KEY", { reqBody: body, key });
          return res.status(400).json({
            success: false,
            code:    'UNKNOWN_PREFERENCE_KEY',
            message: `${key} is not a valid preference field.`,
          });
        }

        if (!PREFERENCE_VALIDATORS[key].validate(value)) {
          console.log("PUT /api/profile 400 ERROR: INVALID_PREFERENCE_VALUE", { reqBody: body, key, value });
          return res.status(400).json({
            success: false,
            code:    'INVALID_PREFERENCE_VALUE',
            message: `${key} has an invalid value: ${JSON.stringify(value)}`,
          });
        }
        // Add to payload using dot notation for atomic updates
        updatePayload[`preferences.${key}`] = value;
      }
    }

    // ── Guard 5: Ensure there's something to update ────────────────────────
    if (Object.keys(updatePayload).length === 0) {
      console.log("PUT /api/profile 400 ERROR: NO_UPDATE_DATA", { reqBody: body });
      return res.status(400).json({
        success: false,
        code:    'NO_UPDATE_DATA',
        message: 'No valid fields were provided to update.',
      });
    }

    // ── Execute atomic update ──────────────────────────────────────────────
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updatePayload },
      { new: true, runValidators: true } // `new: true` returns the updated doc
    ).select('-passwordHash -__v');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        code:    'USER_NOT_FOUND',
        message: 'User not found for update.',
      });
    }

    // Determine type of update for the activity log
    const isSettingsUpdate = incomingPrefs !== undefined;
    
    await ActivityLog.create({
      userId: req.user._id,
      action: isSettingsUpdate ? 'Updated accessibility preferences' : 'Updated profile information',
      type: isSettingsUpdate ? 'settings_changed' : 'profile_updated',
      metadata: { fieldsUpdated: Object.keys(updatePayload) }
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user:    updatedUser.toJSON(), // Return the updated user profile
    });

  } catch (err) {
    // Handle potential Mongoose validation errors, though manual validation
    // should catch most issues.
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        code:    'VALIDATION_ERROR',
        message: err.message,
      });
    }
    return next(err);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image provided.' });
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    
    // Fetch user first to get old avatar URL
    const oldUser = await User.findById(req.user._id);
    
    if (oldUser && oldUser.avatarUrl && oldUser.avatarUrl.startsWith('/uploads/')) {
      const oldFilename = oldUser.avatarUrl.split('/').pop();
      const oldFilePath = path.join(__dirname, '../../public/uploads', oldFilename);
      
      // Delete old file if it exists and isn't the same as new one (unlikely with timestamps)
      fs.unlink(oldFilePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('[NeuroAdapt] Error deleting old avatar:', err);
        }
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { avatarUrl } },
      { new: true, runValidators: true }
    ).select('-passwordHash -__v');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await ActivityLog.create({
      userId: req.user._id,
      action: 'Updated profile picture',
      type: 'profile_updated',
      metadata: {}
    });

    return res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully.',
      user: updatedUser.toJSON(),
      avatarUrl
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
};

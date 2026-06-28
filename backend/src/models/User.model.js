'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const { Schema } = mongoose;

// ─── Accessibility Preferences Sub-Schema ────────────────────────────────────
// Embedded subdocument — stored inside the User document.
// Keeping preferences embedded (not in a separate collection) means a single
// DB read gives both identity AND preferences — no extra JOIN/lookup needed.
const PreferencesSchema = new Schema(
  {
    // Controls which LLM prompt template is used:
    //   'basic'    → Grade 5 reading level
    //   'standard' → Grade 8 reading level (default)
    //   'academic' → Light simplification for university users
    simplificationLevel: {
      type:    String,
      enum:    ['basic', 'standard', 'academic'],
      default: 'standard',
    },

    // When true, the content script bolds the first 40-50% of each word.
    // No backend call is required — purely client-side rendering flag.
    bionicModeEnabled: {
      type:    Boolean,
      default: false,
    },

    // When true, Focus Mode strips sidebars, ads, and non-content elements
    // from the page DOM.
    focusModeEnabled: {
      type:    Boolean,
      default: false,
    },

    // 'openDyslexic' injects a CSS @font-face into the page that makes letter
    // shapes more distinct — reducing character reversal for dyslexic users.
    fontFamily: {
      type:    String,
      enum:    ['default', 'openDyslexic'],
      default: 'default',
    },

    // Pixel size of body text rendered in Focus Mode.
    // Constrained between 12px (minimum legible) and 28px (large-print).
    fontSize: {
      type:    Number,
      min:     12,
      max:     28,
      default: 16,
    },

    // High-contrast reading theme applied in Focus Mode.
    //   'light'  → Black text on white  (WCAG AA ✅)
    //   'dark'   → White text on dark   (WCAG AA ✅)
    //   'yellow' → Black text on yellow (AAA for low-vision users)
    //   'cream'  → Black text on cream  (reduced harshness vs pure white)
    colorTheme: {
      type:    String,
      enum:    ['light', 'dark', 'yellow', 'cream'],
      default: 'light',
    },

    // CSS line-height multiplier. Research shows 1.5-1.8 significantly helps
    // dyslexic and ADHD readers track lines without losing their place.
    lineSpacing: {
      type:    Number,
      min:     1.0,
      max:     2.5,
      default: 1.5,
    },
  },
  { _id: false } // Subdocument — no standalone _id needed
);

// ─── Main User Schema ─────────────────────────────────────────────────────────
const UserSchema = new Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    // Primary unique identifier. Stored lowercase to prevent duplicate accounts
    // caused by capitalisation differences (e.g. User@email.com vs user@email.com).
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match: [
        /^\S+@\S+\.\S+$/,
        'Please provide a valid email address',
      ],
    },

    passwordHash: {
      type:     String,
      required: [true, 'Password hash is required'],
    },

    fullName: {
      type:      String,
      trim:      true,
      maxlength: [50, 'Full name cannot exceed 50 characters'],
      default:   '',
      validate: {
        validator(v) {
          return !v || v.length >= 2;
        },
        message: 'Full name must be at least 2 characters',
      },
    },

    username: {
      type:      String,
      unique:    true,
      sparse:    true, // allows nulls if users haven't set it yet
      trim:      true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username cannot exceed 20 characters'],
      match: [
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers, and underscores',
      ],
    },

    displayName: {
      type:      String,
      default:   '',
      trim:      true,
      maxlength: [50, 'Display name cannot exceed 50 characters'],
    },

    bio: {
      type:      String,
      default:   '',
      trim:      true,
      maxlength: [200, 'Bio cannot exceed 200 characters'],
    },

    phone: {
      type:      String,
      default:   '',
      trim:      true,
    },

    // ── Additional Profile Info ───────────────────────────────────────────────
    occupation: {
      type:      String,
      default:   '',
      trim:      true,
      maxlength: [100, 'Occupation cannot exceed 100 characters'],
    },


    avatarUrl: {
      type:      String,
      default:   '',
      trim:      true,
    },

    // ── Accessibility Profile ─────────────────────────────────────────────────
    // Embedded preferences subdocument. Synced to the extension on every login
    // so the user's settings follow them to any device.
    preferences: {
      type:    PreferencesSchema,
      default: () => ({}), // Initialises with all enum/default values from PreferencesSchema
    },

    // ── Onboarding Profile Type ───────────────────────────────────────────────
    // Set during the 3-screen onboarding flow. Used to:
    //   1. Apply recommended accessibility presets automatically.
    //   2. Feed anonymised aggregate analytics for the IEEE research paper.
    profileType: {
      type:    String,
      enum:    ['dyslexia', 'adhd', 'elderly', 'general'],
      default: 'general',
    },

    // ── Engagement Metrics ────────────────────────────────────────────────────
    // Incremented on every successful simplification request (even cache hits).
    // Key metric for the success dashboard and usage rate reporting.
    totalSimplifications: {
      type:    Number,
      default: 0,
      min:     0,
    },

    totalWordsSimplified: {
      type:    Number,
      default: 0,
      min:     0,
    },

    cacheHits: {
      type:    Number,
      default: 0,
      min:     0,
    },

    cacheMisses: {
      type:    Number,
      default: 0,
      min:     0,
    },

    readingSessions: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // ── Rate Limiting ─────────────────────────────────────────────────────────
    dailySimplificationCount: {
      type:    Number,
      default: 0,
      min:     0,
    },
    dailySimplificationDate: {
      type:    String, // Store as YYYY-MM-DD
      default: () => new Date().toISOString().split('T')[0],
    },

    // ── Activity Tracking ─────────────────────────────────────────────────────
    // Updated every time the user makes any authenticated request.
    // Allows "last active X days ago" display without a full UsageLog query.
    lastActiveAt: {
      type:    Date,
      default: Date.now,
    },

    lastSimplificationAt: {
      type:    Date,
      default: null,
    },

    totalReadingTimeSaved: {
      type:    Number,
      default: 0,
      min:     0,
    },
  },
  {
    // Adds createdAt and updatedAt fields automatically.
    // createdAt → set once at document creation, never changes.
    // updatedAt → updated by Mongoose on every save() or findOneAndUpdate().
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// email already has a unique index (declared inline above via unique: true).
// Additional compound/sparse indexes can be added here if query patterns grow.

// Useful for admin dashboards filtering users by profileType:
// (displayName index removed — NeuroAdapt never queries users by displayName)
UserSchema.index({ profileType: 1 });

// ─── Pre-Save Hook — bcrypt Password Hashing ─────────────────────────────────
// Runs BEFORE every document.save() call.
// Guard: only re-hash if the passwordHash field was actually modified.
// This prevents double-hashing on unrelated saves (e.g. updating preferences).
UserSchema.pre('save', async function hashPasswordIfModified(next) {
  // `this` = the User document being saved
  if (!this.isModified('passwordHash')) {
    return next(); // Field unchanged — skip hashing
  }

  try {
    // Salt rounds = 10 (TAD §3.1.1 and Security Doc §1.3).
    // At 10 rounds, bcrypt takes ~100ms per hash — slow enough to defeat
    // brute-force but fast enough for normal user login flows.
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

// ─── Instance Method — comparePassword ───────────────────────────────────────
// Used by the auth controller during login.
// Compares a plain-text candidate password against the stored bcrypt hash.
// NEVER compare passwords with string equality — always use this method.
UserSchema.methods.comparePassword = async function comparePassword(candidatePlain) {
  return bcrypt.compare(candidatePlain, this.passwordHash);
};

// ─── toJSON Transform ─────────────────────────────────────────────────────────
// Strip sensitive fields before any JSON serialisation.
// Ensures passwordHash and __v never leak into API responses,
// even if a developer accidentally returns the raw document.
UserSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', UserSchema);

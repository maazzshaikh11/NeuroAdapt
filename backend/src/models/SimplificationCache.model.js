'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

// ─── SimplificationCache Schema ───────────────────────────────────────────────
//
// PURPOSE
// -------
// Every successful LLM simplification result is stored here.
// When a second user (or the same user) simplifies the EXACT same text at the
// same level, the backend returns the cached result instantly — no LLM API call
// is made. This is the primary cost-control mechanism (est. 60-70% cost
// reduction for repeated content per Security Doc §5.2).
//
// CACHE KEY
// ---------
// inputHash = SHA-256( originalText + simplificationLevel )
// The hash is computed in src/utils/hashText.js before querying this collection.
// Two requests are a cache hit if and only if BOTH the text AND the level match.
//
// USER PRIVACY
// ------------
// No userId is stored here. The cache is fully anonymous — it stores text
// hashes, not user identities. Safe to share across all authenticated users.
//
// TTL (AUTO-EXPIRY)
// -----------------
// expiresAt stores the target expiry date (createdAt + 30 days by default, or
// lastHitAt + 30 days when updated on a cache hit).
// The MongoDB TTL index on expiresAt with expireAfterSeconds: 0 means MongoDB
// will delete the document once the current time surpasses expiresAt.
// This prevents the collection growing unboundedly without a cron job.
// ─────────────────────────────────────────────────────────────────────────────

const SimplificationCacheSchema = new Schema(
  {
    // ── Lookup Key ────────────────────────────────────────────────────────────
    // SHA-256 fingerprint of (originalText + simplificationLevel).
    // Unique — two identical inputs produce the same hash → cache hit.
    // Indexed for O(log n) lookup speed even as the collection grows.
    inputHash: {
      type:     String,
      required: [true, 'inputHash is required'],
      unique:   true,   // Unique index declared here; Mongoose creates it automatically
      index:    true,   // Explicit index flag for clarity (redundant with unique but clear)
      trim:     true,
    },

    // ── Stored Content ────────────────────────────────────────────────────────
    // The original text that was simplified.
    // Stored so we can display the before/after pair in analytics.
    // We do NOT store user IDs alongside this — no PII link.
    originalText: {
      type:     String,
      required: [true, 'originalText is required'],
    },

    // The AI-simplified version returned to the user.
    // This is what gets served on a cache hit.
    simplifiedText: {
      type:     String,
      required: [true, 'simplifiedText is required'],
    },

    // Which simplification level produced this result.
    // Part of the cache key — 'basic' and 'standard' versions of the same
    // text are stored as separate cache entries.
    simplificationLevel: {
      type: String,
      enum: ['basic', 'standard', 'academic'],
    },

    // ── Performance Metadata ──────────────────────────────────────────────────
    // How many times this cached entry has been served instead of calling the LLM.
    // High hitCount = high ROI for this cache entry.
    // Incremented atomically via $inc in cache.service.js to avoid race conditions.
    hitCount: {
      type:    Number,
      default: 1,
      min:     1,
    },

    // Records which AI provider generated this result.
    // Enables quality comparison between Gemini and OpenAI over time,
    // informing which provider to default to.
    llmProvider: {
      type: String,
      enum: ['gemini', 'openai', 'huggingface', 'groq'],
    },

    // How long the original LLM call took in milliseconds.
    // Useful for latency benchmarking and SLA monitoring.
    latencyMs: {
      type: Number,
      min:  0,
    },

    // ── Creation Timestamp ────────────────────────────────────────────────────
    // Records the exact moment this cache entry was first created.
    // Required for:
    //   • Cache growth analytics (how many entries created per day/week)
    //   • Hit-rate reports (entries created vs entries ever served)
    //   • Admin dashboard metrics (cache collection size over time)
    //   • Future cache monitoring and eviction policy tuning
    // Note: this is NOT managed by Mongoose timestamps: true (that option is
    // disabled on this schema for precise TTL control). It is set once at
    // insertion and never changed — unlike lastHitAt which updates on every hit.
    createdAt: {
      type:      Date,
      default:   Date.now,
      immutable: true, // Prevent accidental overwrite after document creation
    },

    // ── TTL Field ─────────────────────────────────────────────────────────────
    // The exact UTC Date at which this document should be deleted.
    // Set to: Date.now() + (CACHE_TTL_DAYS × 86400000ms) at creation time.
    // Reset to: Date.now() + 30 days on every cache hit (rolling expiry).
    // The TTL index below tells MongoDB to check this field and delete the
    // document when expiresAt < Date.now() (expireAfterSeconds: 0 means
    // "delete immediately once the Date has passed").
    expiresAt: {
      type:    Date,
      index:   { expireAfterSeconds: 0 }, // TTL index — MongoDB deletes doc when Date passes
      default: () => {
        // Default TTL: 30 days from creation.
        // Can be overridden via CACHE_TTL_DAYS env var in cache.service.js.
        const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
        return new Date(Date.now() + TTL_MS);
      },
    },

    // When this cache entry was last served (cache hit).
    // Used by cache.service.js to roll the expiresAt forward on each hit,
    // implementing a sliding-window expiry (active entries stay alive).
    lastHitAt: {
      type:    Date,
      default: Date.now,
    },
  },
  {
    // No timestamps: true here — we manage createdAt-equivalent via expiresAt
    // and lastHitAt manually for precise TTL control.
    // Explicitly set to false to keep the document lean.
    timestamps: false,
  }
);

// ─── Explicit Compound / Additional Indexes ───────────────────────────────────
// inputHash already has a unique index from the field declaration above.
// An additional explicit compound index is not needed for the MVP query pattern
// (cache lookup is always: findOne({ inputHash }) — single-field lookup).

// Index on simplificationLevel for potential analytics queries
// ("what's the cache hit rate for 'basic' simplifications?")
SimplificationCacheSchema.index({ simplificationLevel: 1 });

// Index on lastHitAt for cache analytics queries sorted by most-recently-used
SimplificationCacheSchema.index({ lastHitAt: -1 });

module.exports = mongoose.model('SimplificationCache', SimplificationCacheSchema);

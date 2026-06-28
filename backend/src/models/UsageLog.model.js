'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

// ─── UsageLog Schema ──────────────────────────────────────────────────────────
//
// PURPOSE
// -------
// Append-only event log of every significant user action in NeuroAdapt.
// Never updated after insertion — new event, new document.
// Provides the empirical dataset for:
//   1. The IEEE TechForGood 2026 research paper metrics
//   2. The user's personal analytics dashboard (usage history, top domains)
//   3. Admin aggregate analytics (anonymised per k-anonymity rules)
//
// PRIVACY DESIGN
// --------------
// - userId is nullable → anonymous/guest sessions are still logged (no userId)
// - hostname stores only the domain (e.g. 'en.wikipedia.org') — never the
//   full URL, which could contain query params with PII.
// - No raw text is stored here. charCount preserves the metric without the data.
//
// WRITE PATTERN
// -------------
// Insert-only. Controllers never call .save() with updates — only insertOne().
// This ensures the log is tamper-evident and consistent with Security Doc §3.1.
// ─────────────────────────────────────────────────────────────────────────────

const UsageLogSchema = new Schema(
  {
    // ── User Reference ────────────────────────────────────────────────────────
    // References the User._id who triggered the event.
    // Nullable: if the user is not logged in (guest mode), this is null/undefined.
    // Guest sessions are still tracked for aggregate research metrics.
    userId: {
      type: Schema.Types.ObjectId,
      ref:  'User',    // Mongoose populate() reference
      default: null,   // Explicitly nullable for guest/anonymous events
      index: true,     // Indexed — frequent query: "find all logs for userId X"
    },

    // ── Event Classification ──────────────────────────────────────────────────
    // What action triggered this log entry.
    //   'simplify'    → User clicked Simplify (AI or cache served)
    //   'focusMode'   → User toggled Focus Mode on or off
    //   'bionicMode'  → User toggled Bionic Reading on or off
    //   'profileUpdate' → User saved their accessibility preferences
    // Enum prevents arbitrary strings from polluting analytics queries.
    eventType: {
      type:     String,
      enum:     ['simplify', 'focusMode', 'bionicMode', 'profileUpdate'],
      required: [true, 'eventType is required'],
    },

    // ── Simplification-Specific Fields ────────────────────────────────────────
    // Was this simplification result served from cache?
    // true  → No LLM API call was made (free for the platform)
    // false → An LLM API call was made (costs tokens)
    // null  → Not applicable (e.g., focusMode toggle events)
    cacheHit: {
      type: Boolean,
      default: null,
    },

    // Length of text submitted for simplification (in characters).
    // Used to calculate average input sizes and detect unusually large requests.
    // We store the count, not the raw text — privacy-safe.
    charCount: {
      type: Number,
      min:  0,
    },

    // ── Context ───────────────────────────────────────────────────────────────
    // The domain name of the page where the action occurred.
    // Stored as hostname only (e.g. 'en.wikipedia.org'), never full URL.
    // Used for "Top domains you simplify on" in the user dashboard.
    hostname: {
      type: String,
      trim: true,
    },

    // Which simplification level was requested.
    // Null for non-simplification event types.
    simplificationLevel: {
      type: String,
      enum: ['basic', 'standard', 'academic', null],
    },

    // ── Performance ───────────────────────────────────────────────────────────
    // End-to-end response latency as experienced by the extension (in ms).
    // Includes network transit + backend processing + LLM call (if any).
    // Used for p95 latency tracking against the < 3s KPI in PRD §5.1.
    latencyMs: {
      type: Number,
      min:  0,
    },

    // Estimated reading time saved (seconds) from this simplification.
    readingTimeSaved: {
      type: Number,
      min:  0,
      default: 0,
    },

    // ── Timestamp ─────────────────────────────────────────────────────────────
    // The exact time this event occurred (UTC).
    // Indexed — the most common query pattern is "events within a date range".
    // Default to Date.now so callers don't need to pass it explicitly.
    timestamp: {
      type:    Date,
      default: Date.now,
      index:   true, // Single-field index for simple date-range queries
    },
  },
  {
    // No Mongoose timestamps — we manage timestamp manually above for
    // precise control. Setting timestamps: false keeps the document lean.
    timestamps: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Compound index: the primary analytics query pattern is
// "find all events for userId X, sorted newest first".
// The compound index satisfies both the filter AND the sort in one B-tree scan.
// { userId: 1, timestamp: -1 }
//   → Forward scan on userId (equality filter)
//   → Reverse scan on timestamp (descending sort — newest first)
// This index also covers "admin: all events in a date range" if userId is
// provided. For global admin date-range queries without userId, the single
// timestamp index on the field itself handles it.
UsageLogSchema.index({ userId: 1, timestamp: -1 });

// Index on eventType for aggregate analytics:
// "How many simplify events happened this week?" → efficient with this index.
UsageLogSchema.index({ eventType: 1 });

// Index on hostname for "top domains" dashboard widget queries.
UsageLogSchema.index({ hostname: 1 });

// Optimized for analytics endpoint (T-1.8)
// Query pattern:
// { userId, eventType: 'simplify', timestamp: { $gte: startDate } }
UsageLogSchema.index({
  userId: 1,
  eventType: 1,
  timestamp: -1
});

module.exports = mongoose.model('UsageLog', UsageLogSchema);

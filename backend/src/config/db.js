'use strict';

const mongoose = require('mongoose');

// ─── MongoDB Connection Configuration ─────────────────────────────────────────
//
// Uses Mongoose's built-in connection pool.
// All models (User, SimplificationCache, UsageLog) share the same connection.
//
// OPTIONS
// -------
// serverSelectionTimeoutMS:
//   How long (ms) Mongoose waits to find an available MongoDB server before
//   throwing a "Server selection timed out" error. Default is 30,000ms.
//   Reduced to 10,000ms here so a misconfigured URI fails fast on startup
//   rather than hanging silently for 30 seconds.
//
// socketTimeoutMS:
//   How long (ms) a socket can be idle before being closed.
//   0 = disabled (let MongoDB Atlas manage idle connections).
//
// maxPoolSize:
//   Maximum number of connections Mongoose keeps open in its pool.
//   MongoDB Atlas M0 free tier allows 100 connections total.
//   Setting to 10 is conservative and appropriate for a single-instance server.
// ─────────────────────────────────────────────────────────────────────────────

const MONGOOSE_OPTIONS = {
  serverSelectionTimeoutMS: 10_000, // Fail-fast if Atlas is unreachable
  socketTimeoutMS:          0,      // Let Atlas manage idle socket timeouts
  maxPoolSize:              10,     // Max open connections (safe for Atlas M0)
};

/**
 * connectDB
 * ---------
 * Establishes a Mongoose connection to MongoDB Atlas using the URI defined in
 * process.env.MONGODB_URI.
 *
 * Called once in server.js before app.listen().
 * If the connection fails, the error is logged and the process exits with
 * code 1 — a deliberate fail-fast strategy. Running the server without a
 * database would result in silent, cascading failures on every request.
 *
 * @returns {Promise<void>}
 */
async function connectDB() {
  // Guard: ensure the environment variable is set before attempting a connection.
  // This surfaces a clear misconfiguration error instead of a cryptic Mongoose error.
  if (!process.env.MONGODB_URI) {
    console.error('[DB] ❌ MONGODB_URI is not defined in environment variables.');
    console.error('[DB]    Add it to your .env file and restart the server.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, MONGOOSE_OPTIONS);

    console.log(
      `[DB] ✅ MongoDB connected: ${conn.connection.host} / ${conn.connection.name}`
    );
  } catch (err) {
    // Log the full error (including stack trace) to assist debugging.
    // In production this will surface in Railway/Render logs.
    // Security note: this only runs server-side and never reaches the API response.
    console.error('[DB] ❌ MongoDB connection failed:', err.message);

    if (process.env.NODE_ENV !== 'test') {
      // Exit cleanly — let the process manager (Railway, PM2, Docker) restart.
      process.exit(1);
    }
    // In test environments, re-throw so test runners can handle the failure.
    throw err;
  }
}

// ─── Mongoose Connection Event Listeners ─────────────────────────────────────
// These fire throughout the lifetime of the server, not just on initial connect.

// Fires if the connection is lost after initial success (e.g. Atlas network blip).
mongoose.connection.on('disconnected', () => {
  console.warn('[DB] ⚠️  MongoDB disconnected. Mongoose will attempt to reconnect...');
});

// Fires when Mongoose successfully reconnects after a disconnection.
mongoose.connection.on('reconnected', () => {
  console.log('[DB] ✅ MongoDB reconnected.');
});

// Fires on any connection-level error (distinct from initial connection failure).
mongoose.connection.on('error', (err) => {
  console.error('[DB] ❌ MongoDB connection error:', err.message);
});

module.exports = connectDB;

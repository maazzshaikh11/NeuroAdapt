'use strict';

/**
 * CORS Configuration — NeuroAdapt Backend
 *
 * Reads ALLOWED_ORIGINS from environment.
 * If '*' is provided (dev only), allows all origins.
 * Otherwise uses strict whitelist matching.
 */

const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. server-to-server, Postman in dev)
    if (!origin) return callback(null, true);

    if (allowedOriginsEnv === '*') {
      return callback(null, true);
    }

    const allowedOrigins = allowedOriginsEnv.split(',').map(o => o.trim());
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

module.exports = corsOptions;

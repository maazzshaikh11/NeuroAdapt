'use strict';

/**
 * Rate Limiters — NeuroAdapt Backend
 *
 * Uses express-rate-limit to protect endpoints.
 */

const rateLimit = require('express-rate-limit');

const isDevelopment = process.env.NODE_ENV === 'development';
const DEFAULT_AUTH_WINDOW_MS = 15 * 60 * 1000;

const authRateLimitWindowMs = Number.parseInt(
  process.env.AUTH_RATE_LIMIT_WINDOW_MS,
  10
) || DEFAULT_AUTH_WINDOW_MS;

const authRateLimitMax = Number.parseInt(
  process.env.AUTH_RATE_LIMIT_MAX,
  10
) || (isDevelopment ? 100 : 5);

// Custom handler to return the exact requested JSON structure
const handler = (req, res, next, options) => {
  res.status(429).json({
    success: false,
    code: 'RATE_LIMIT',
    message: options.message
  });
};

const authLimiter = rateLimit({
  windowMs: authRateLimitWindowMs,
  max: authRateLimitMax,
  message: 'Too many requests. Please wait.',
  handler,
  standardHeaders: true,
  legacyHeaders: false,
});

const simplifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 60 seconds
  max: 20,             // 20 requests
  message: 'Too many requests. Please wait.',
  handler,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  simplifyLimiter
};

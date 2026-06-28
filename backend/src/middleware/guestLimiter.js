'use strict';

// Simple in-memory Map for guest limits.
// Key: "IP_YYYY-MM-DD" -> Value: Number (request count)
const guestRequestCounts = new Map();

/**
 * Middleware to limit unauthenticated guests to 3 simplification requests per day.
 * Bypassed completely if req.user exists (i.e. authenticated users).
 */
const guestLimiter = (req, res, next) => {
  // 1. Skip if authenticated
  if (req.user) {
    return next();
  }

  // 2. Identify guest by IP and current date
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const today = new Date().toISOString().split('T')[0];
  const key = `${ip}_${today}`;

  // 3. Check and increment limit
  const currentCount = guestRequestCounts.get(key) || 0;

  if (currentCount >= 3) {
    return res.status(429).json({
      success: false,
      code: 'GUEST_LIMIT_REACHED',
      message: 'Guest limit exceeded'
    });
  }

  guestRequestCounts.set(key, currentCount + 1);

  // Note: Memory leaks are theoretically possible in a very high traffic, multi-day uptime
  // environment if old days aren't cleared, but this meets the simple in-memory map requirement
  // for MVP. A daily clear interval could be added later.

  next();
};

module.exports = guestLimiter;

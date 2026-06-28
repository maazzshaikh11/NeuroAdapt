'use strict';

const DAILY_LIMIT = 50;

function getTodayUTC() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Returns today's simplification count for a user document.
 * Resets to 0 when the stored date is not today (UTC).
 */
function getDailySimplificationCount(user) {
  if (!user) return 0;
  const today = getTodayUTC();
  if (user.dailySimplificationDate !== today) return 0;
  return user.dailySimplificationCount || 0;
}

function getDailyRemaining(user) {
  return Math.max(0, DAILY_LIMIT - getDailySimplificationCount(user));
}

module.exports = {
  DAILY_LIMIT,
  getTodayUTC,
  getDailySimplificationCount,
  getDailyRemaining,
};

'use strict';

const { simplifyText } = require('../services/llm.service');
const { checkCache, saveToCache } = require('../services/cache.service');
const UsageLog = require('../models/UsageLog.model');
const User = require('../models/User.model');
const ActivityLog = require('../models/ActivityLog.model');

const {
  DAILY_LIMIT,
  getTodayUTC,
} = require('../utils/dailyLimit');

/**
 * Validates the simplification request payload.
 */
function validatePayload(text, level) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { valid: false, code: 'VALIDATION_MISSING_FIELD' };
  }
  if (text.length > 5000) {
    return { valid: false, code: 'AI_INPUT_TOO_LONG' };
  }

  const validLevels = ['basic', 'standard', 'academic'];
  if (level && !validLevels.includes(level)) {
    return { valid: false, code: 'INVALID_SIMPLIFICATION_LEVEL' };
  }

  return { valid: true };
}

/**
 * Estimate reading time saved in seconds.
 * Baseline ~200 wpm; simplified text typically saves ~30% reading time.
 */
function calculateReadingTimeSaved(wordCount) {
  if (!wordCount || wordCount <= 0) return 0;
  return Math.max(1, Math.round((wordCount / 200) * 60 * 0.3));
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Builds the MongoDB update operation for an authenticated simplification.
 */
function buildUserUpdate(user, { wordCount, cacheHit, readingTimeSaved, today }) {
  const incPayload = {
    totalSimplifications: 1,
    totalWordsSimplified: wordCount,
    totalReadingTimeSaved: readingTimeSaved,
  };

  if (cacheHit) {
    incPayload.cacheHits = 1;
  } else {
    incPayload.cacheMisses = 1;
  }

  const updateOp = {
    $inc: incPayload,
    $set: {
      lastActiveAt: new Date(),
      lastSimplificationAt: new Date(),
    },
  };

  if (user.dailySimplificationDate !== today || user.dailySimplificationCount === 0) {
    updateOp.$set.dailySimplificationDate = today;
    updateOp.$set.dailySimplificationCount = 1;
  } else {
    updateOp.$inc.dailySimplificationCount = 1;
  }

  return updateOp;
}

function getDailyUsedAfterUpdate(user, today) {
  if (user.dailySimplificationDate !== today || user.dailySimplificationCount === 0) {
    return 1;
  }
  return user.dailySimplificationCount + 1;
}

function isDailyLimitReached(user) {
  const today = getTodayUTC();
  const count = user.dailySimplificationDate === today
    ? user.dailySimplificationCount
    : 0;
  return count >= DAILY_LIMIT;
}

/**
 * Persists UsageLog, ActivityLog, and User counters for an authenticated user.
 */
async function recordAuthenticatedSimplification(user, {
  text,
  level,
  hostname,
  cacheHit,
  latencyMs,
}) {
  const wordCount = countWords(text);
  const readingTimeSaved = calculateReadingTimeSaved(wordCount);
  const today = getTodayUTC();

  if (user.dailySimplificationDate !== today) {
    user.dailySimplificationCount = 0;
    user.dailySimplificationDate = today;
  }

  if (user.dailySimplificationCount >= DAILY_LIMIT) {
    return { rateLimited: true };
  }

  await UsageLog.create({
    userId: user._id,
    eventType: 'simplify',
    cacheHit,
    charCount: text.length,
    hostname,
    simplificationLevel: level,
    latencyMs,
    readingTimeSaved,
  });

  console.log('[Analytics] UsageLog inserted', {
    userId: user._id.toString(),
    hostname,
    cacheHit,
    charCount: text.length,
    readingTimeSaved,
    latencyMs,
  });

  const updateOp = buildUserUpdate(user, { wordCount, cacheHit, readingTimeSaved, today });
  await User.updateOne({ _id: user._id }, updateOp);

  console.log('[Analytics] User counters updated', {
    userId: user._id.toString(),
    updateOp,
  });

  await ActivityLog.create({
    userId: user._id,
    action: `Simplified content on ${hostname}`,
    type: 'simplification_completed',
    metadata: {
      level,
      hostname,
      charCount: text.length,
      cacheHit,
      latencyMs,
      readingTimeSaved,
    },
  });

  console.log('[Analytics] ActivityLog inserted', {
    userId: user._id.toString(),
    hostname,
  });

  return {
    rateLimited: false,
    dailyUsed: getDailyUsedAfterUpdate(user, today),
    dailyLimit: DAILY_LIMIT,
    readingTimeSaved,
  };
}

async function recordGuestSimplification({ text, level, hostname, cacheHit, latencyMs }) {
  const wordCount = countWords(text);
  const readingTimeSaved = calculateReadingTimeSaved(wordCount);

  await UsageLog.create({
    userId: null,
    eventType: 'simplify',
    cacheHit,
    charCount: text.length,
    hostname,
    simplificationLevel: level,
    latencyMs,
    readingTimeSaved,
  });
}

function buildAuthMeta(recordResult) {
  if (!recordResult || recordResult.rateLimited) return {};
  return {
    dailyUsed: recordResult.dailyUsed,
    dailyLimit: recordResult.dailyLimit,
    readingTimeSaved: recordResult.readingTimeSaved,
  };
}

/**
 * POST /api/simplify
 * Core logic for the NeuroAdapt simplification feature.
 */
async function simplifyController(req, res, next) {
  try {
    let { text, level, hostname } = req.body;

    console.log('[Analytics] POST /api/simplify', {
      authenticated: !!req.user,
      userId: req.user?._id?.toString() || null,
      hostname: hostname || 'unknown',
    });

    const validation = validatePayload(text, level);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        code: validation.code,
      });
    }

    level = level || 'standard';
    hostname = (typeof hostname === 'string' && hostname.trim().length > 0)
      ? hostname.trim()
      : 'unknown';

    if (req.user && isDailyLimitReached(req.user)) {
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMIT',
        message: 'Daily simplification limit reached.',
      });
    }

    const cached = await checkCache(text, level);

    if (req.user) {
      if (cached) {
        const recordResult = await recordAuthenticatedSimplification(req.user, {
          text,
          level,
          hostname,
          cacheHit: true,
          latencyMs: 0,
        });

        if (recordResult.rateLimited) {
          return res.status(429).json({
            success: false,
            code: 'RATE_LIMIT',
            message: 'Daily simplification limit reached.',
          });
        }

        return res.json({
          success: true,
          simplifiedText: cached.simplifiedText,
          cacheHit: true,
          latencyMs: 0,
          provider: cached.llmProvider,
          ...buildAuthMeta(recordResult),
        });
      }
    } else if (cached) {
      await recordGuestSimplification({
        text,
        level,
        hostname,
        cacheHit: true,
        latencyMs: 0,
      });

      return res.json({
        success: true,
        simplifiedText: cached.simplifiedText,
        cacheHit: true,
        latencyMs: 0,
        provider: cached.llmProvider,
      });
    }

    const startTime = Date.now();
    const result = await simplifyText(text, level, 'English');
    const latencyMs = Date.now() - startTime;

    const savedCache = await saveToCache(
      text,
      level,
      result.simplifiedText,
      result.provider,
      latencyMs
    );

    let recordResult = null;

    if (req.user) {
      recordResult = await recordAuthenticatedSimplification(req.user, {
        text,
        level,
        hostname,
        cacheHit: false,
        latencyMs,
      });

      if (recordResult.rateLimited) {
        return res.status(429).json({
          success: false,
          code: 'RATE_LIMIT',
          message: 'Daily simplification limit reached.',
        });
      }
    } else {
      await recordGuestSimplification({
        text,
        level,
        hostname,
        cacheHit: false,
        latencyMs,
      });
    }

    return res.json({
      success: true,
      simplifiedText: savedCache.simplifiedText,
      cacheHit: false,
      latencyMs,
      provider: savedCache.llmProvider,
      ...buildAuthMeta(recordResult),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  simplifyController,
};

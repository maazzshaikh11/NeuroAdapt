'use strict';

const User = require('../models/User.model');
const UsageLog = require('../models/UsageLog.model');
const ActivityLog = require('../models/ActivityLog.model');
const {
  DAILY_LIMIT,
  getDailySimplificationCount,
  getDailyRemaining,
} = require('../utils/dailyLimit');

/**
 * @route GET /api/analytics/overview
 * @desc  Fetch real analytics, usage data, and recent activity for the dashboard.
 */
exports.getAnalyticsOverview = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const recentActivityDocs = await ActivityLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentActivity = recentActivityDocs.map((act) => {
      let icon = '⚡';
      let color = 'bg-brand/10 text-brand';

      if (act.type === 'profile_updated' || act.type === 'settings_changed') {
        icon = '⚙️';
        color = 'bg-slate-500/15 text-secondary';
      } else if (act.type === 'account_created') {
        icon = '🎉';
        color = 'bg-emerald-500/15 text-emerald-400';
      } else if (act.type === 'simplification_completed') {
        icon = '📄';
        color = 'bg-brand text-brand';
      }

      return {
        id: act._id,
        time: act.createdAt,
        action: act.action,
        icon,
        color,
      };
    });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setUTCDate(today.getUTCDate() - 6);

    const logsLast7Days = await UsageLog.find({
      userId,
      eventType: 'simplify',
      timestamp: { $gte: sevenDaysAgo },
    }).lean();

    const dailyUsage = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setUTCDate(d.getUTCDate() + i);
      dailyUsage.push({
        day: days[d.getUTCDay()],
        date: d.toISOString().split('T')[0],
        count: 0,
      });
    }

    let weeklySimplifications = 0;
    let weeklyReadingTimeSaved = 0;
    const uniqueSites = new Set();

    logsLast7Days.forEach((log) => {
      weeklySimplifications++;
      weeklyReadingTimeSaved += log.readingTimeSaved || 0;

      if (log.hostname) {
        uniqueSites.add(log.hostname);
      }

      const logDate = log.timestamp.toISOString().split('T')[0];
      const targetDay = dailyUsage.find((d) => d.date === logDate);
      if (targetDay) {
        targetDay.count++;
      }
    });

    const domainCounts = {};
    logsLast7Days.forEach((log) => {
      if (log.hostname) {
        domainCounts[log.hostname] = (domainCounts[log.hostname] || 0) + 1;
      }
    });

    const topDomains = Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalRequests = (user.cacheHits || 0) + (user.cacheMisses || 0);
    const cacheHitRate = totalRequests > 0
      ? Math.round(((user.cacheHits || 0) / totalRequests) * 100)
      : 0;

    const dailySimplificationCount = getDailySimplificationCount(user);

    const payload = {
      totalSimplifications: user.totalSimplifications || 0,
      totalWordsSimplified: user.totalWordsSimplified || 0,
      weeklySimplifications,
      weeklyReadingTimeSaved,
      readingTimeSaved: user.totalReadingTimeSaved || 0,
      cacheHitRate,
      sitesVisited: uniqueSites.size,
      dailyUsage,
      recentActivity,
      topDomains,
      dailySimplificationCount,
      dailyLimit: DAILY_LIMIT,
      dailyRemaining: getDailyRemaining(user),
    };

    console.log('[Analytics] GET /api/analytics/overview', {
      userId: userId.toString(),
      totalSimplifications: payload.totalSimplifications,
      weeklySimplifications: payload.weeklySimplifications,
      sitesVisited: payload.sitesVisited,
      recentActivityCount: payload.recentActivity.length,
    });

    res.status(200).json({
      success: true,
      ...payload,
    });
  } catch (err) {
    next(err);
  }
};

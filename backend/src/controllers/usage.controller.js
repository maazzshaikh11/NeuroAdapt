'use strict';

/**
 * Usage Controller — NeuroAdapt Backend
 *
 * Provides analytics data for the user dashboard.
 * Uses MongoDB aggregation pipelines to calculate totals,
 * cache hit rates, top domains, and zero-filled daily usage.
 */

const UsageLog = require('../models/UsageLog.model');

async function getUsageAnalytics(req, res, next) {
  try {
    const period = req.query.period || '7d';

    if (period !== '7d' && period !== '30d') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PERIOD'
      });
    }

    const days = period === '30d' ? 30 : 7;
    
    // Calculate startDate (start of the day, UTC)
    const now = new Date();
    const startDate = new Date(now);
    startDate.setUTCDate(startDate.getUTCDate() - days + 1);
    startDate.setUTCHours(0, 0, 0, 0);

    // Single aggregation query using $facet to calculate everything in parallel
    const pipeline = [
      {
        $match: {
          userId: req.user._id,
          eventType: 'simplify',
          timestamp: { $gte: startDate }
        }
      },
      {
        $facet: {
          // Calculate total and cache hits
          metrics: [
            {
              $group: {
                _id: null,
                totalSimplifications: { $sum: 1 },
                cacheHitCount: {
                  $sum: { $cond: [{ $eq: ['$cacheHit', true] }, 1, 0] }
                }
              }
            }
          ],
          // Calculate top 5 domains
          topDomains: [
            {
              $group: {
                _id: '$hostname',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
              $project: {
                _id: 0,
                hostname: '$_id',
                count: 1
              }
            }
          ],
          // Group counts by YYYY-MM-DD
          rawDailyUsage: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ];

    const result = await UsageLog.aggregate(pipeline);
    const facets = result[0] || {};
    
    // Extract Metrics
    const metrics = (facets.metrics && facets.metrics[0]) || { totalSimplifications: 0, cacheHitCount: 0 };
    const totalSimplifications = metrics.totalSimplifications;
    const cacheHitCount = metrics.cacheHitCount;
    const topDomains = facets.topDomains || [];
    
    // Calculate cache hit rate
    let cacheHitRate = 0;
    if (totalSimplifications > 0) {
      cacheHitRate = Math.round((cacheHitCount / totalSimplifications) * 100);
    }

    // Process daily usage (zero-filling missing days)
    const rawDaily = facets.rawDailyUsage || [];
    const dailyMap = new Map(rawDaily.map(d => [d._id, d.count]));
    
    const dailyUsage = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      dailyUsage.push({
        date: dateStr,
        count: dailyMap.get(dateStr) || 0
      });
    }

    // Send Response
    return res.json({
      success: true,
      period,
      totalSimplifications,
      cacheHitRate,
      topDomains,
      dailyUsage
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUsageAnalytics
};

'use strict';

/**
 * Test Script — T-1.8 Usage Analytics
 *
 * Usage:
 *   PORT=5558 MONGODB_URI='mongodb://localhost:27017/neuroadapt_test' \
 *     JWT_SECRET='test-secret-key-12345' node scripts/test-usage.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const jwt      = require('jsonwebtoken');
const app      = require('../src/server');
const User     = require('../src/models/User.model');
const UsageLog = require('../src/models/UsageLog.model');

const PORT       = process.env.PORT || 5558;
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-12345';

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function makeRequest(method, path, { token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`http://localhost:${PORT}${path}`, { method, headers });
  const data = await response.json();
  return { status: response.status, data };
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

let passed = 0;
let failed = 0;

function check(label, condition) {
  if (condition) {
    console.log(`✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${label}`);
    failed++;
  }
}

async function runTests() {
  console.log('=== T-1.8 Usage Analytics Endpoint Tests ===\n');

  try {
    await delay(2000); // Server init wait

    // ── Setup ──────────────────────────────────────────────────────────────
    await User.deleteMany({ email: 'usageuser@neuroadapt.dev' });
    const user = await User.create({
      email:        'usageuser@neuroadapt.dev',
      passwordHash: 'hash',
      displayName:  'Analytics User',
      profileType:  'general',
    });
    
    // Seed Data Setup (We will use mock timestamps)
    await UsageLog.deleteMany({ userId: user._id });
    const now = new Date();
    
    // Function to generate dates relative to today
    const daysAgo = (d) => {
      const target = new Date(now);
      target.setUTCDate(target.getUTCDate() - d);
      target.setUTCHours(12, 0, 0, 0); // Noon UTC
      return target;
    };

    const logsToInsert = [
      // Today (2 logs: 1 hit, 1 miss) - Domains: github.com, en.wikipedia.org
      { userId: user._id, eventType: 'simplify', cacheHit: true, hostname: 'github.com', timestamp: daysAgo(0) },
      { userId: user._id, eventType: 'simplify', cacheHit: false, hostname: 'en.wikipedia.org', timestamp: daysAgo(0) },
      
      // Yesterday (3 logs: 0 hit, 3 miss) - Domains: en.wikipedia.org (2), reddit.com (1)
      { userId: user._id, eventType: 'simplify', cacheHit: false, hostname: 'en.wikipedia.org', timestamp: daysAgo(1) },
      { userId: user._id, eventType: 'simplify', cacheHit: false, hostname: 'en.wikipedia.org', timestamp: daysAgo(1) },
      { userId: user._id, eventType: 'simplify', cacheHit: false, hostname: 'reddit.com', timestamp: daysAgo(1) },
      
      // 3 Days Ago (1 log: 1 hit) - Domain: github.com
      { userId: user._id, eventType: 'simplify', cacheHit: true, hostname: 'github.com', timestamp: daysAgo(3) },
      
      // 8 Days Ago (1 log: 1 hit) - Out of 7d window!
      { userId: user._id, eventType: 'simplify', cacheHit: true, hostname: 'old.com', timestamp: daysAgo(8) }
    ];
    await UsageLog.insertMany(logsToInsert);

    const token = signToken({ userId: user._id, email: user.email });

    // ── Tests ─────────────────────────────────────────────────────────────
    
    console.log('--- Test 1: Invalid Period ---');
    let res = await makeRequest('GET', '/api/usage?period=10d', { token });
    check('Returns 400', res.status === 400);
    check('Code is INVALID_PERIOD', res.data.code === 'INVALID_PERIOD');
    console.log('');

    console.log('--- Test 2: 7d Period ---');
    res = await makeRequest('GET', '/api/usage?period=7d', { token });
    check('Returns 200', res.status === 200);
    check('Total Simplifications is 6 (excludes 8 days ago and non-simplify)', res.data.totalSimplifications === 6);
    // Cache hits in 7d: Today (1), 3 Days Ago (1) = 2. Total = 6. 2/6 = 33%
    check('Cache Hit Rate is 33%', res.data.cacheHitRate === 33);
    
    check('Top Domains count is 3', res.data.topDomains.length === 3);
    check('Top Domain #1 is en.wikipedia.org (3)', res.data.topDomains[0].hostname === 'en.wikipedia.org' && res.data.topDomains[0].count === 3);
    check('Top Domain #2 is github.com (2)', res.data.topDomains[1].hostname === 'github.com' && res.data.topDomains[1].count === 2);
    
    check('Daily Usage array length is 7', res.data.dailyUsage.length === 7);
    const todayStr = daysAgo(0).toISOString().split('T')[0];
    const yestStr = daysAgo(1).toISOString().split('T')[0];
    const threeStr = daysAgo(3).toISOString().split('T')[0];
    check('Today has 2 count', res.data.dailyUsage.find(d => d.date === todayStr).count === 2);
    check('Yesterday has 3 count', res.data.dailyUsage.find(d => d.date === yestStr).count === 3);
    check('3 days ago has 1 count', res.data.dailyUsage.find(d => d.date === threeStr).count === 1);
    check('2 days ago has 0 count (padded)', res.data.dailyUsage.find(d => d.date === daysAgo(2).toISOString().split('T')[0]).count === 0);
    console.log('');

    console.log('--- Test 3: 30d Period ---');
    res = await makeRequest('GET', '/api/usage?period=30d', { token });
    check('Returns 200', res.status === 200);
    check('Total Simplifications is 7 (includes 8 days ago)', res.data.totalSimplifications === 7);
    check('Cache Hit Rate is 43% (3/7)', res.data.cacheHitRate === 43); // 3 hits / 7 total = 0.4285 -> 43%
    check('Daily Usage array length is 30', res.data.dailyUsage.length === 30);
    console.log('');

    console.log('--- Test 4: Empty Data Set ---');
    await UsageLog.deleteMany({ userId: user._id });
    res = await makeRequest('GET', '/api/usage?period=7d', { token });
    check('Returns 200', res.status === 200);
    check('Total Simplifications is 0', res.data.totalSimplifications === 0);
    check('Cache Hit Rate is 0', res.data.cacheHitRate === 0);
    check('Top Domains is empty array', res.data.topDomains.length === 0);
    check('Daily Usage array length is 7', res.data.dailyUsage.length === 7);
    check('All daily counts are 0', res.data.dailyUsage.every(d => d.count === 0));
    console.log('');

    // Cleanup
    await User.deleteMany({ email: 'usageuser@neuroadapt.dev' });
    
    console.log('========================================');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('========================================');

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();

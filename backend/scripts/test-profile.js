'use strict';

/**
 * Test Script — T-1.6 Profile API
 *
 * Tests JWT middleware + GET/PUT /api/profile end-to-end.
 * Creates a test user directly in MongoDB, signs a JWT, and
 * exercises all validation paths.
 *
 * Usage:
 *   PORT=5555 MONGODB_URI='mongodb://localhost:27017/neuroadapt_test' \
 *     JWT_SECRET='test-secret-key-12345' node scripts/test-profile.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const jwt      = require('jsonwebtoken');
const app      = require('../src/server');
const User     = require('../src/models/User.model');

const PORT       = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-12345';

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function makeRequest(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const response = await fetch(`http://localhost:${PORT}${path}`, opts);
  const data     = await response.json();
  return { status: response.status, data };
}

function signToken(payload, secret = JWT_SECRET) {
  return jwt.sign(payload, secret, { expiresIn: '1h' });
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

// ─── Tests ────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('=== T-1.6 Profile API Tests ===\n');

  try {
    await delay(2000); // Wait for DB + server bind

    // ── Setup: create a test user ──────────────────────────────────────────
    await User.deleteMany({ email: 'testprofile@neuroadapt.dev' });
    const testUser = await User.create({
      email:        'testprofile@neuroadapt.dev',
      passwordHash: 'plaintext-will-be-hashed-by-pre-save',
      fullName:     'Test User',
      displayName:  'Test User',
      profileType:  'general',
    });
    const validToken   = signToken({ userId: testUser._id, email: testUser.email });
    const invalidToken = 'this.is.not.a.valid.jwt';
    const wrongUserToken = signToken({ userId: new mongoose.Types.ObjectId(), email: 'ghost@neuroadapt.dev' });

    console.log('--- Test 1: Missing Token ---');
    let res = await makeRequest('GET', '/api/profile');
    check('Returns 401', res.status === 401);
    check('Code is TOKEN_REQUIRED', res.data.code === 'TOKEN_REQUIRED');
    console.log('');

    console.log('--- Test 2: Invalid Token ---');
    res = await makeRequest('GET', '/api/profile', { token: invalidToken });
    check('Returns 401', res.status === 401);
    check('Code is INVALID_TOKEN', res.data.code === 'INVALID_TOKEN');
    console.log('');

    console.log('--- Test 3: Valid Token, Deleted User ---');
    res = await makeRequest('GET', '/api/profile', { token: wrongUserToken });
    check('Returns 401', res.status === 401);
    check('Code is USER_NOT_FOUND', res.data.code === 'USER_NOT_FOUND');
    console.log('');

    console.log('--- Test 4: GET Profile (Valid) ---');
    res = await makeRequest('GET', '/api/profile', { token: validToken });
    check('Returns 200', res.status === 200);
    check('success is true', res.data.success === true);
    check('Has user.id', !!res.data.user.id);
    check('Has user.email', res.data.user.email === 'testprofile@neuroadapt.dev');
    check('Has user.displayName', res.data.user.displayName === 'Test User');
    check('Has user.preferences', !!res.data.user.preferences);
    check('Has user.profileType', res.data.user.profileType === 'general');
    check('Has user.totalSimplifications', res.data.user.totalSimplifications === 0);
    check('No passwordHash', res.data.user.passwordHash === undefined);
    console.log('Response:', JSON.stringify(res.data, null, 2));
    console.log('');

    console.log('--- Test 5: PUT Update Preferences (Valid) ---');
    res = await makeRequest('PUT', '/api/profile', {
      token: validToken,
      body:  {
        preferences: {
          fontSize:             20,
          colorTheme:           'dark',
          simplificationLevel:  'basic',
          bionicModeEnabled:    true,
        },
      },
    });
    check('Returns 200', res.status === 200);
    check('success is true', res.data.success === true);
    check('fontSize updated to 20', res.data.user.preferences.fontSize === 20);
    check('colorTheme updated to dark', res.data.user.preferences.colorTheme === 'dark');
    check('simplificationLevel updated to basic', res.data.user.preferences.simplificationLevel === 'basic');
    check('bionicModeEnabled updated to true', res.data.user.preferences.bionicModeEnabled === true);
    // Unchanged preferences should still have their defaults
    check('lineSpacing unchanged (1.5)', res.data.user.preferences.lineSpacing === 1.5);
    check('fontFamily unchanged (default)', res.data.user.preferences.fontFamily === 'default');
    console.log('Response:', JSON.stringify(res.data, null, 2));
    console.log('');

    console.log('--- Test 6a: Invalid Preference Value (fontSize out of range) ---');
    res = await makeRequest('PUT', '/api/profile', {
      token: validToken,
      body:  { preferences: { fontSize: 99 } },
    });
    check('Returns 400', res.status === 400);
    check('Code is INVALID_PREFERENCE_VALUE', res.data.code === 'INVALID_PREFERENCE_VALUE');
    console.log('');

    console.log('--- Test 6b: Invalid Preference Value (bad colorTheme) ---');
    res = await makeRequest('PUT', '/api/profile', {
      token: validToken,
      body:  { preferences: { colorTheme: 'rainbow' } },
    });
    check('Returns 400', res.status === 400);
    check('Code is INVALID_PREFERENCE_VALUE', res.data.code === 'INVALID_PREFERENCE_VALUE');
    console.log('');

    console.log('--- Test 6c: Reject Forbidden Field (passwordHash) ---');
    res = await makeRequest('PUT', '/api/profile', {
      token: validToken,
      body:  { passwordHash: 'hacked' },
    });
    check('Returns 400', res.status === 400);
    check('Code is INVALID_FIELD', res.data.code === 'INVALID_FIELD');
    console.log('');

    console.log('--- Test 6d: Reject Unknown Preference Key ---');
    res = await makeRequest('PUT', '/api/profile', {
      token: validToken,
      body:  { preferences: { hackerField: true } },
    });
    check('Returns 400', res.status === 400);
    check('Code is UNKNOWN_PREFERENCE_KEY', res.data.code === 'UNKNOWN_PREFERENCE_KEY');
    console.log('');

    console.log('--- Test 7: Verify GET Reflects Updates ---');
    res = await makeRequest('GET', '/api/profile', { token: validToken });
    check('fontSize is now 20', res.data.user.preferences.fontSize === 20);
    check('colorTheme is now dark', res.data.user.preferences.colorTheme === 'dark');
    console.log('');

    // ── Cleanup ────────────────────────────────────────────────────────────
    await User.deleteMany({ email: 'testprofile@neuroadapt.dev' });

    console.log('========================================');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('========================================');

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Tests finished, DB disconnected.');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();

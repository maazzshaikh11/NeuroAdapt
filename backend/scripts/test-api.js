'use strict';

/**
 * End-to-end API smoke tests for NeuroAdapt backend.
 *
 * Usage:
 *   PORT=5001 node scripts/test-api.js
 */

require('dotenv').config();

const PORT = process.env.PORT || 5000;
const BASE = `http://localhost:${PORT}`;

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

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function run() {
  console.log('=== NeuroAdapt API Smoke Tests ===\n');

  const email = `smoke_${Date.now()}@neuroadapt.dev`;
  const password = 'SmokeTest123!';
  let token;

  let res = await req('POST', '/api/auth/register', {
    email,
    password,
    fullName: 'Smoke Test',
    displayName: 'Smoke Test',
  });
  check('Register returns 201', res.status === 201);
  check('Register returns token', !!res.data.token);
  check('Register sets fullName', res.data.user?.fullName === 'Smoke Test');
  token = res.data.token;

  res = await req('POST', '/api/auth/login', { email, password });
  check('Login returns 200', res.status === 200);
  check('Login returns token', !!res.data.token);
  token = res.data.token || token;

  res = await req('GET', '/api/profile', null, token);
  check('Get profile returns 200', res.status === 200);
  check('Get profile returns user', !!res.data.user);

  res = await req('PUT', '/api/profile', {
    fullName: 'Updated Smoke',
    displayName: 'Updated',
    bio: 'Test bio',
  }, token);
  check('Update profile returns 200', res.status === 200);
  check('Update profile sets fullName', res.data.user?.fullName === 'Updated Smoke');

  res = await req('PUT', '/api/profile', {
    preferences: { fontSize: 20, colorTheme: 'dark', simplificationLevel: 'basic' },
  }, token);
  check('Update preferences returns 200', res.status === 200);
  check('Preferences fontSize updated', res.data.user?.preferences?.fontSize === 20);

  res = await req('GET', '/api/analytics/overview', null, token);
  check('Analytics returns 200', res.status === 200);
  check('Analytics includes success flag', res.data.success === true);
  check('Analytics includes totalSimplifications', typeof res.data.totalSimplifications === 'number');

  res = await req('POST', '/api/simplify', {
    text: 'The quick brown fox jumps over the lazy dog.',
    hostname: 'smoke.example.com',
  }, token);
  check('Simplify returns 200', res.status === 200);
  check('Simplify returns simplifiedText', !!res.data.simplifiedText);
  check('Simplify returns dailyUsed', typeof res.data.dailyUsed === 'number');

  res = await req('GET', '/api/analytics/overview', null, token);
  check('Analytics reflects simplify usage', res.data.totalSimplifications >= 1);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});

'use strict';

/**
 * Auth API tests — registration password validation and login.
 *
 * Usage:
 *   PORT=5001 node scripts/test-auth.js
 */

require('dotenv').config();

const { validatePassword } = require('../src/utils/validatePassword');

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

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function runUnitTests() {
  console.log('--- Unit: validatePassword ---');

  const tooShort = validatePassword('abc123');
  check('Rejects password shorter than 8 characters', tooShort.valid === false);
  check('Short password code is INVALID_PASSWORD', tooShort.code === 'INVALID_PASSWORD');
  check(
    'Short password message mentions 8 characters',
    tooShort.message.includes('8 characters')
  );

  const noUpper = validatePassword('abcdefg1');
  check('Rejects password without uppercase letter', noUpper.valid === false);
  check('No-upper message mentions uppercase', noUpper.message.includes('uppercase'));

  const noLower = validatePassword('ABCDEFG1');
  check('Rejects password without lowercase letter', noLower.valid === false);
  check('No-lower message mentions lowercase', noLower.message.includes('lowercase'));

  const noNumber = validatePassword('Abcdefgh');
  check('Rejects password without number', noNumber.valid === false);
  check('No-number message mentions number', noNumber.message.includes('number'));

  const valid = validatePassword('ValidPass1');
  check('Accepts valid password', valid.valid === true);
  console.log('');
}

async function runIntegrationTests() {
  console.log('--- Integration: POST /api/auth/register ---');

  const shortEmail = `short_${Date.now()}@example.com`;
  let res = await req('POST', '/api/auth/register', {
    fullName: 'Test User',
    email: shortEmail,
    password: 'abc123',
  });
  check('Short password returns 400', res.status === 400);
  check('Short password code is INVALID_PASSWORD', res.data.code === 'INVALID_PASSWORD');
  check(
    'Short password message mentions 8 characters',
    typeof res.data.message === 'string' && res.data.message.includes('8 characters')
  );

  res = await req('POST', '/api/auth/register', {
    fullName: 'Test User',
    email: `weak_${Date.now()}@example.com`,
    password: 'alllowercase1',
  });
  check('Missing uppercase returns 400', res.status === 400);
  check('Missing uppercase code is INVALID_PASSWORD', res.data.code === 'INVALID_PASSWORD');

  const validEmail = `auth_${Date.now()}@neuroadapt.dev`;
  const validPassword = 'ValidPass1';
  res = await req('POST', '/api/auth/register', {
    fullName: 'Auth Test User',
    email: validEmail,
    password: validPassword,
  });
  check('Valid registration returns 201', res.status === 201);
  check('Valid registration returns token', !!res.data.token);

  console.log('\n--- Integration: POST /api/auth/login ---');
  res = await req('POST', '/api/auth/login', {
    email: validEmail,
    password: validPassword,
  });
  check('Login returns 200 for valid user', res.status === 200);
  check('Login returns token', !!res.data.token);
  console.log('');
}

async function run() {
  console.log('=== NeuroAdapt Auth Tests ===\n');

  runUnitTests();
  await runIntegrationTests();

  console.log(`=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});

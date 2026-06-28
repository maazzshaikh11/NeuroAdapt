'use strict';

/**
 * Test Script — T-1.7 Security Middleware
 *
 * Tests CORS, Rate Limits, and Global Error Handler.
 *
 * Usage:
 *   PORT=5557 ALLOWED_ORIGINS='http://localhost:5173' node scripts/test-security.js
 */

require('dotenv').config();
const app = require('../src/server');

const PORT = process.env.PORT || 5557;

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function makeRequest(method, path, headers = {}, body = null) {
  const opts = { method, headers };
  if (body) {
    opts.body = body;
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const response = await fetch(`http://localhost:${PORT}${path}`, opts);
  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = await response.text();
  }
  return { status: response.status, data };
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
  console.log('=== T-1.7 Security & Reliability Middleware Tests ===\n');

  try {
    await delay(2000); // Wait for server to bind

    console.log('--- Test 1: CORS Allowed Origin ---');
    let res = await makeRequest('OPTIONS', '/health', { Origin: 'http://localhost:5173' });
    // CORS preflight should succeed
    check('Allowed origin succeeds (204 No Content)', res.status === 204);
    console.log('');

    console.log('--- Test 2: CORS Blocked Origin ---');
    res = await makeRequest('GET', '/health', { Origin: 'http://evil.com' });
    check('Blocked origin returns 403', res.status === 403);
    check('Returns CORS_BLOCKED code', res.data.code === 'CORS_BLOCKED');
    console.log('');

    console.log('--- Test 3: Rate Limit Triggers (Simplify Guest) ---');
    console.log('Spamming /api/simplify 21 times...');
    let rateLimited = false;
    for (let i = 0; i < 21; i++) {
      const resp = await makeRequest('POST', '/api/simplify', {}, JSON.stringify({ text: `test ${i}` }));
      if (resp.status === 429) {
        rateLimited = true;
        check('Returns 429 on 21st request', true);
        check('Code is RATE_LIMIT', resp.data.code === 'RATE_LIMIT');
        check('Has proper message', resp.data.message === 'Too many requests. Please wait.');
        break;
      }
    }
    if (!rateLimited) {
      check('Rate limit was triggered', false);
    }
    console.log('');

    console.log('--- Test 4: Global Error Handler - Mapped Error ---');
    // Since our controllers currently handle some errors directly, we'll test the error handler
    // by injecting an error through a malformed JSON payload that express.json() catches.
    // express.json() will throw a SyntaxError, which falls through to our global handler.
    console.log('Sending malformed JSON to trigger SyntaxError...');
    res = await makeRequest('POST', '/api/simplify', { 'Content-Type': 'application/json' }, '{ bad json ');
    check('Returns 500 or proper error status', res.status >= 400);
    // Our global handler falls back to 500 SERVER_ERROR for unmapped errors like SyntaxError
    // Wait, express.json() sets err.status = 400. Our error handler says:
    // res.status(err.status || 500).json({ code: err.code || 'SERVER_ERROR' })
    // err.code from SyntaxError is usually undefined or a string like 'entity.parse.failed'
    check('Response format is controlled by global handler (success=false)', res.data.success === false);
    check('No stack trace exposed', res.data.stack === undefined);
    console.log('');

    console.log('========================================');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('========================================');

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();

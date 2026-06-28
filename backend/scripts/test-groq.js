'use strict';

/**
 * Test Script — T-1.9 Groq LLM Migration
 *
 * Tests the LLM Service Layer directly by mocking global.fetch to simulate 
 * various Groq API responses, errors, timeouts, and quota limits.
 *
 * Usage:
 *   node scripts/test-groq.js
 */

const assert = require('assert');
const { simplifyText } = require('../src/services/llm.service');

// Store original environment to restore after tests
const originalEnv = { ...process.env };
const originalFetch = global.fetch;

// Helper to delay
const delay = (ms) => new Promise(res => setTimeout(res, ms));

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
  console.log('=== T-1.9 Groq LLM Migration Tests ===\n');

  try {
    // --- Test 1: Missing API Keys ---
    console.log('--- Test 1: Missing API Keys ---');
    process.env = {}; // Clear all env vars
    try {
      await simplifyText('Hello world');
      check('Should throw AI_SERVICE_UNAVAILABLE when no keys exist', false);
    } catch (err) {
      check('Throws AI_SERVICE_UNAVAILABLE', err.message === 'AI_SERVICE_UNAVAILABLE');
    }
    console.log('');

    // --- Setup standard environment for further tests ---
    process.env.GROQ_API_KEY_1 = 'mock_key_1';
    process.env.GROQ_API_KEY_2 = 'mock_key_2';
    process.env.GROQ_MODEL = 'llama-3.3-70b-versatile';

    // --- Test 2: Valid API Key (First key succeeds) ---
    console.log('--- Test 2: Valid API Key (First key succeeds) ---');
    let fetchCallCount = 0;
    global.fetch = async (url, options) => {
      fetchCallCount++;
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'This is the simplified text.' } }]
        })
      };
    };

    let result = await simplifyText('This is a complex sentence requiring simplification.', 'standard', 'English');
    check('Success is true', result.success === true);
    check('Provider is "groq"', result.provider === 'groq');
    check('Returns simplified text', result.simplifiedText === 'This is the simplified text.');
    check('LatencyMs is returned', typeof result.latencyMs === 'number');
    check('Fetch was called exactly once', fetchCallCount === 1);
    console.log('');

    // --- Test 3: Automatic Key Rotation (First fails 401, Second succeeds) ---
    console.log('--- Test 3: Automatic Key Rotation (401 Auth Error) ---');
    fetchCallCount = 0;
    let authHeaders = [];
    global.fetch = async (url, options) => {
      fetchCallCount++;
      authHeaders.push(options.headers['Authorization']);
      if (fetchCallCount === 1) {
        return {
          ok: false,
          status: 401,
          text: async () => 'Unauthorized'
        };
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Success on second key.' } }]
        })
      };
    };

    result = await simplifyText('Test text');
    check('Success is true', result.success === true);
    check('Provider is "groq"', result.provider === 'groq');
    check('Returns text from second key', result.simplifiedText === 'Success on second key.');
    check('Fetch was called twice', fetchCallCount === 2);
    check('First call used key 1', authHeaders[0] === 'Bearer mock_key_1');
    check('Second call used key 2', authHeaders[1] === 'Bearer mock_key_2');
    console.log('');

    // --- Test 4: Quota Limit Rotation (429 Rate Limit) ---
    console.log('--- Test 4: Quota Limit Rotation (429 Rate Limit) ---');
    fetchCallCount = 0;
    global.fetch = async (url, options) => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        return {
          ok: false,
          status: 429,
          text: async () => 'Rate limit exceeded'
        };
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Recovered.' } }]
        })
      };
    };

    result = await simplifyText('Test text');
    check('Successfully rotated after 429', result.simplifiedText === 'Recovered.');
    check('Fetch was called twice', fetchCallCount === 2);
    console.log('');

    // --- Test 5: All Keys Fail ---
    console.log('--- Test 5: All Keys Fail ---');
    global.fetch = async (url, options) => {
      return {
        ok: false,
        status: 429,
        text: async () => 'Rate limit'
      };
    };

    try {
      await simplifyText('Test text');
      check('Should throw when all keys fail', false);
    } catch (err) {
      check('Throws generic AI_SERVICE_UNAVAILABLE error', err.message === 'AI_SERVICE_UNAVAILABLE');
    }
    console.log('');

    // --- Test 6: Network Failure / Timeout Rotation ---
    console.log('--- Test 6: Network Failure / Timeout Rotation ---');
    fetchCallCount = 0;
    global.fetch = async (url, options) => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        throw error;
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Survived timeout.' } }]
        })
      };
    };

    result = await simplifyText('Test text');
    check('Successfully rotated after AbortError (timeout)', result.simplifiedText === 'Survived timeout.');
    check('Fetch was called twice', fetchCallCount === 2);
    console.log('');

    // --- Test 7: Response Cleaning Behavior ---
    console.log('--- Test 7: Response Cleaning Behavior ---');
    global.fetch = async (url, options) => {
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Here is the simplified version:\n\n```text\nClean text.\n```' } }]
        })
      };
    };

    result = await simplifyText('Test text');
    check('Preamble and markdown blocks are stripped', result.simplifiedText === 'Clean text.');
    console.log('');
    
    // --- Test 8: Invalid Text Input ---
    console.log('--- Test 8: Invalid Text Input ---');
    try {
      await simplifyText('   ');
      check('Should throw for empty text', false);
    } catch(err) {
      check('Throws INVALID_TEXT_INPUT', err.message === 'INVALID_TEXT_INPUT');
    }
    console.log('');

  } catch (error) {
    console.error('Test script crashed:', error);
  } finally {
    // Restore global fetch and process.env
    global.fetch = originalFetch;
    process.env = originalEnv;

    console.log('========================================');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('========================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();

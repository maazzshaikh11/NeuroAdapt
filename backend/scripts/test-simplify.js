'use strict';

require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
// Mock LLM Service before loading app
const llmService = require('../src/services/llm.service');
llmService.simplifyText = async (text, level, language) => {
  return { simplifiedText: `MOCKED: ${text}`, provider: 'gemini' };
};

const app = require('../src/server'); // App exports before listen block completes
const SimplificationCache = require('../src/models/SimplificationCache.model');
const UsageLog = require('../src/models/UsageLog.model');

const PORT = process.env.PORT || 5000;

// Wait a bit for server.js IIFE to finish binding
const delay = ms => new Promise(res => setTimeout(res, ms));

async function makeRequest(body) {
  const response = await fetch(`http://localhost:${PORT}/api/simplify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  return { status: response.status, data };
}

async function runTests() {
  console.log('--- neuroadapt API test: /api/simplify ---\n');

  try {
    await delay(2000); // Wait 2s for DB connect and server bind
    // Clear DB for test
    await SimplificationCache.deleteMany({});
    await UsageLog.deleteMany({});

    console.log('Test 1: Validation Failure (Missing Text)');
    let res = await makeRequest({ level: 'basic' });
    console.log(`Status: ${res.status}`);
    console.log('Response:', res.data);
    if (res.status === 400 && res.data.code === 'VALIDATION_MISSING_FIELD') {
      console.log('✅ PASS');
    } else {
      console.error('❌ FAIL');
    }
    console.log('-----------------------------\n');

    console.log('Test 2: Cache Miss & Successful Simplification');
    const textToSimplify = 'NeuroAdapt is going to be incredibly useful for users.';
    res = await makeRequest({
      text: textToSimplify,
      level: 'basic',
      hostname: 'example.com'
    });
    console.log(`Status: ${res.status}`);
    console.log('Response:', res.data);
    if (res.status === 200 && res.data.success === true && res.data.cacheHit === false) {
      console.log('✅ PASS');
    } else {
      console.error('❌ FAIL');
    }
    console.log('-----------------------------\n');

    console.log('Test 3: Cache Hit');
    res = await makeRequest({
      text: textToSimplify,
      level: 'basic',
      hostname: 'example.com'
    });
    console.log(`Status: ${res.status}`);
    console.log('Response:', res.data);
    if (res.status === 200 && res.data.success === true && res.data.cacheHit === true) {
      console.log('✅ PASS');
    } else {
      console.error('❌ FAIL');
    }
    console.log('-----------------------------\n');

    console.log('Test 4: Guest Limit Reached');
    // We already made 2 valid requests (Test 2 and 3). Let's make 2 more to hit the limit.
    await makeRequest({ text: 'Fill request 3', level: 'standard' });
    res = await makeRequest({ text: 'Fill request 4', level: 'standard' });
    
    console.log(`Status: ${res.status}`);
    console.log('Response:', res.data);
    if (res.status === 429 && res.data.code === 'GUEST_LIMIT_REACHED') {
      console.log('✅ PASS');
    } else {
      console.error('❌ FAIL');
    }
    console.log('-----------------------------\n');

    console.log('Test 5: Verify UsageLogs');
    const logs = await UsageLog.find({});
    console.log(`Total Usage Logs: ${logs.length}`);
    if (logs.length === 2) { // Test 2, Test 3 (Test 1 validation fail wasn't logged, Fill req was blocked)
      console.log('✅ PASS: Logs accurately recorded.');
    } else {
      console.error('❌ FAIL: Incorrect number of logs.');
    }

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Tests finished, DB disconnected.');
    process.exit(0);
  }
}

runTests();

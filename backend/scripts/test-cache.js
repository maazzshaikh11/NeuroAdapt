'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const { hashText } = require('../src/utils/hashText');
const { checkCache, saveToCache } = require('../src/services/cache.service');
const SimplificationCache = require('../src/models/SimplificationCache.model');

// Mock connection logic if Mongoose isn't connected
async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/neuroadapt_test';
    await mongoose.connect(MONGODB_URI);
  }
}

async function runTests() {
  console.log('--- neuroadapt cache test ---\n');

  try {
    await connectDB();
    
    // Clear collection for clean testing
    await SimplificationCache.deleteMany({});
    
    const text1 = 'This is a complex sentence that needs simplification.';
    const text2 = '  this   is a    complex sentence that needs   simplification.  ';
    const level1 = 'basic';
    const level2 = 'academic';
    
    // Test 1: Verify Hash generation and normalization
    console.log('Test 1: Verify Hash generation and normalization');
    const hash1 = hashText(text1, level1);
    const hash2 = hashText(text2, level1);
    const hash3 = hashText(text1, level2);
    
    console.log(`Hash 1 (text1, basic): ${hash1}`);
    console.log(`Hash 2 (text2, basic): ${hash2}`);
    console.log(`Hash 3 (text1, academic): ${hash3}`);
    
    if (hash1 === hash2) {
      console.log('✅ PASS: Normalized texts produce the same hash.');
    } else {
      console.error('❌ FAIL: Normalized texts produce different hashes.');
    }
    
    if (hash1 !== hash3) {
      console.log('✅ PASS: Different levels produce different hashes.');
    } else {
      console.error('❌ FAIL: Different levels produce the same hash.');
    }
    console.log('-----------------------------');

    // Test 2: Read cache entry (Miss)
    console.log('\nTest 2: Read cache entry (Miss)');
    const missResult = await checkCache(text1, level1);
    if (missResult === null) {
      console.log('✅ PASS: Returned null for non-existent entry.');
    } else {
      console.error('❌ FAIL: Returned document instead of null.');
    }
    console.log('-----------------------------');

    // Test 3: Save cache entry
    console.log('\nTest 3: Save cache entry');
    const savedDoc = await saveToCache(
      text1,
      level1,
      'This is a simple sentence.',
      'gemini',
      450
    );
    console.log(`Saved Doc ID: ${savedDoc._id}`);
    console.log(`Hit Count: ${savedDoc.hitCount}`);
    if (savedDoc.hitCount === 1) {
      console.log('✅ PASS: Document saved with hitCount 1.');
    } else {
      console.error('❌ FAIL: hitCount is incorrect.');
    }
    console.log('-----------------------------');

    // Test 4: Read cache entry (Hit & Increment)
    console.log('\nTest 4: Read cache entry (Hit & Increment)');
    const hitResult = await checkCache(text1, level1);
    console.log(`Hit Count after read: ${hitResult.hitCount}`);
    if (hitResult.hitCount === 2) {
      console.log('✅ PASS: hitCount incremented to 2.');
    } else {
      console.error('❌ FAIL: hitCount did not increment correctly.');
    }
    console.log('-----------------------------');

    // Test 5: Verify Duplicate Handling (E11000)
    console.log('\nTest 5: Verify Duplicate Handling');
    const duplicateDoc = await saveToCache(
      text2, // Using text2 to show normalization still hits same hash
      level1,
      'This is another simple sentence.', // Should be ignored
      'openai',
      500
    );
    console.log(`Duplicate Save Result ID: ${duplicateDoc._id}`);
    if (duplicateDoc._id.toString() === savedDoc._id.toString()) {
      console.log('✅ PASS: Gracefully returned existing document on duplicate key.');
    } else {
      console.error('❌ FAIL: Created new document or crashed instead of resolving duplicate.');
    }
    console.log('-----------------------------');

  } catch (error) {
    console.error('Test script crashed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nTests complete. Disconnected from DB.');
  }
}

runTests();

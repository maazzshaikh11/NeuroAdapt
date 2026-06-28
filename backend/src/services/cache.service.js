'use strict';

const SimplificationCache = require('../models/SimplificationCache.model');
const { hashText } = require('../utils/hashText');

/**
 * Checks the cache for an existing simplification.
 * @param {string} text - The original text.
 * @param {string} level - The target simplification level.
 * @returns {Promise<Object|null>} The cached document if found, null otherwise.
 */
async function checkCache(text, level) {
  const inputHash = hashText(text, level);

  const cachedDoc = await SimplificationCache.findOneAndUpdate(
    { inputHash },
    {
      $inc: { hitCount: 1 },
      $set: { lastHitAt: new Date() }
    },
    { new: true } // Return the updated document
  );

  if (cachedDoc) {
    console.log('[CACHE] HIT');
    return cachedDoc;
  }

  console.log('[CACHE] MISS');
  return null;
}

/**
 * Saves a new simplification result to the cache.
 * @param {string} text - The original text.
 * @param {string} level - The simplification level.
 * @param {string} simplifiedText - The simplified result from LLM.
 * @param {string} provider - The LLM provider ('gemini' or 'openai').
 * @param {number} latencyMs - LLM call latency in milliseconds.
 * @returns {Promise<Object>} The saved (or existing) cache document.
 */
async function saveToCache(text, level, simplifiedText, provider, latencyMs) {
  const inputHash = hashText(text, level);
  const now = new Date();
  
  // 30 days expiry
  const expiresAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

  try {
    const newCacheEntry = new SimplificationCache({
      inputHash,
      originalText: text,
      simplifiedText,
      simplificationLevel: level,
      hitCount: 1,
      llmProvider: provider,
      latencyMs,
      lastHitAt: now,
      expiresAt
    });

    const savedDoc = await newCacheEntry.save();
    console.log('[CACHE] SAVE');
    return savedDoc;

  } catch (error) {
    // Handle Duplicate Key Error (E11000)
    // Occurs when two concurrent requests try to cache the same input.
    if (error.code === 11000) {
      // Fetch the document created by the other request
      const existingDoc = await SimplificationCache.findOne({ inputHash }).lean();
      if (existingDoc) {
        console.log('[CACHE] HIT (resolved duplicate collision)');
        return existingDoc;
      }
    }
    
    // Rethrow any other unknown errors
    throw error;
  }
}

module.exports = {
  checkCache,
  saveToCache
};

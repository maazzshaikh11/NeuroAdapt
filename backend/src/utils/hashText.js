'use strict';

const crypto = require('crypto');

/**
 * Generates a SHA-256 hash for a given text and simplification level.
 * Used as the primary cache key to prevent duplicate LLM calls.
 * 
 * @param {string} text - The input text to be hashed.
 * @param {string} level - The target simplification level (e.g., 'basic', 'standard', 'academic').
 * @returns {string} The SHA-256 hex digest.
 * @throws {Error} If inputs are invalid.
 */
function hashText(text, level) {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new Error('INVALID_CACHE_INPUT');
  }
  if (typeof level !== 'string' || level.trim() === '') {
    throw new Error('INVALID_CACHE_INPUT');
  }

  // Normalize text: collapse internal whitespace, trim, and convert to lowercase
  const normalizedText = text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  
  // Build cache key
  const cacheKey = `${normalizedText}::${level}`;

  // Generate SHA-256 hex digest
  return crypto.createHash('sha256').update(cacheKey).digest('hex');
}

module.exports = { hashText };

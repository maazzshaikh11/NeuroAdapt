'use strict';

/**
 * Validates a plain-text password for registration.
 *
 * @param {string} password
 * @returns {{ valid: true } | { valid: false, code: string, message: string }}
 */
function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return {
      valid: false,
      code: 'INVALID_PASSWORD',
      message: 'Password must be at least 8 characters long.',
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      code: 'INVALID_PASSWORD',
      message: 'Password must contain at least one uppercase letter.',
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      code: 'INVALID_PASSWORD',
      message: 'Password must contain at least one lowercase letter.',
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      code: 'INVALID_PASSWORD',
      message: 'Password must contain at least one number.',
    };
  }

  return { valid: true };
}

module.exports = { validatePassword };

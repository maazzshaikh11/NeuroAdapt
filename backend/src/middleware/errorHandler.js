'use strict';

/**
 * Global Error Handler — NeuroAdapt Backend
 *
 * Catches all unhandled errors in the application.
 * Maps specific internal error codes to user-friendly messages.
 * Prevents stack traces from leaking to the client.
 */

const ERROR_MAP = {
  AI_SERVICE_UNAVAILABLE: {
    status: 503,
    code: 'AI_SERVICE_UNAVAILABLE',
    message: 'AI service temporarily unavailable.'
  },
  AI_INPUT_TOO_LONG: {
    status: 400,
    code: 'AI_INPUT_TOO_LONG',
    message: 'Input text exceeds allowed size.'
  },
  INVALID_TOKEN: {
    status: 401,
    code: 'INVALID_TOKEN',
    message: 'Authentication failed.'
  },
  TOKEN_REQUIRED: {
    status: 401,
    code: 'TOKEN_REQUIRED',
    message: 'Authentication required.'
  }
};

// 4-argument signature is required by Express to recognize this as an error handler.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Log full error server-side
  console.error('[Server Error]', err.stack || err.message);

  // Handle CORS errors
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({
      success: false,
      code: 'CORS_BLOCKED',
      message: 'Request blocked by CORS policy.'
    });
  }

  // Handle mapped errors
  if (err.message && ERROR_MAP[err.message]) {
    const mapped = ERROR_MAP[err.message];
    return res.status(mapped.status).json({
      success: false,
      code: mapped.code,
      message: mapped.message
    });
  }

  // Handle explicit status/code passed by controllers (e.g. from mongoose validation)
  if (err.status || err.code) {
    return res.status(err.status || 500).json({
      success: false,
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'An unexpected error occurred.'
    });
  }

  // Default Unknown Error
  return res.status(500).json({
    success: false,
    code: 'SERVER_ERROR',
    message: 'Something went wrong. Please try again.'
  });
};

module.exports = errorHandler;

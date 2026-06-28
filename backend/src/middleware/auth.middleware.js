'use strict';

/**
 * JWT Authentication Middleware — NeuroAdapt Backend
 *
 * Reads the Authorization header, verifies the JWT, loads the user
 * from MongoDB, and attaches them to req.user.
 *
 * Flow:
 *   Authorization: Bearer <token>
 *   → jwt.verify(token, JWT_SECRET)
 *   → decoded { userId, email }
 *   → User.findById(decoded.userId)
 *   → req.user = user
 *   → next()
 *
 * All failure paths return 401 with a machine-readable code — never
 * expose raw JWT errors or stack traces to the caller.
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User.model');

/**
 * Express middleware that enforces JWT authentication.
 *
 * On success  → attaches the full Mongoose User doc to req.user and calls next().
 * On failure  → sends a 401 JSON response and stops the chain.
 *
 * @param {import('express').Request}      req
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 */
async function authenticate(req, res, next) {
  try {
    // ── Step 1: Extract token from Authorization header ──────────────────────
    // Expected format: "Authorization: Bearer <jwt>"
    // Anything else (missing header, wrong scheme, extra spaces) → 401.
    const authHeader = req.headers['authorization'] || '';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        code:    'TOKEN_REQUIRED',
      });
    }

    // "Bearer " is 7 characters — everything after that is the raw token.
    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        code:    'TOKEN_REQUIRED',
      });
    }

    // ── Step 2: Verify signature and expiry ───────────────────────────────────
    // jwt.verify() throws:
    //   JsonWebTokenError  → bad signature / malformed
    //   TokenExpiredError  → valid signature but exp has passed
    //   NotBeforeError     → nbf claim violation
    // All three indicate an unacceptable token — surface them as INVALID_TOKEN.
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_jwtError) {
      return res.status(401).json({
        success: false,
        code:    'INVALID_TOKEN',
      });
    }

    // ── Step 3: Validate payload shape ────────────────────────────────────────
    // We only trust tokens that carry the userId we originally issued.
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        code:    'INVALID_TOKEN',
      });
    }

    // ── Step 4: Load user from DB ─────────────────────────────────────────────
    // Always re-fetch — never trust a deleted or suspended account that still
    // has a valid (but effectively revoked) token in circulation.
    // Exclude passwordHash from the loaded document for safety.
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        code:    'USER_NOT_FOUND',
      });
    }

    // ── Step 5: Attach to request ─────────────────────────────────────────────
    // Downstream controllers access identity exclusively via req.user._id —
    // never from the request body. This is enforced at the controller level.
    req.user = user;

    return next();

  } catch (err) {
    // Unexpected error (e.g. DB down during findById) — forward to global handler.
    return next(err);
  }
}

/**
 * Optional JWT authentication — attaches req.user when a valid Bearer token
 * is present, but allows the request to continue as a guest when absent or
 * invalid. Used by /api/simplify where auth is optional.
 */
async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || '';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_jwtError) {
      return next();
    }

    if (!decoded || !decoded.userId) {
      return next();
    }

    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (user) {
      req.user = user;
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { authenticate, optionalAuthenticate };

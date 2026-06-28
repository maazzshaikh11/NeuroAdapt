'use strict';

const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
const { validatePassword } = require('../utils/validatePassword');

/**
 * Register a new user
 * @route POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const { email, password, fullName, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_MISSING_FIELD',
        message: 'Email and password are required',
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        code: passwordValidation.code,
        message: passwordValidation.message,
      });
    }

    const trimmedFullName = (fullName || displayName || '').trim();
    const trimmedDisplayName = (displayName || fullName || '').trim();

    if (trimmedFullName && (trimmedFullName.length < 2 || trimmedFullName.length > 50)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_FULL_NAME',
        message: 'Full name must be 2–50 characters.',
      });
    }

    if (trimmedDisplayName.length > 50) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_DISPLAY_NAME',
        message: 'Display name must be up to 50 characters.',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        code: 'USER_ALREADY_EXISTS',
        message: 'A user with that email already exists',
      });
    }

    // Create user (password is passed into passwordHash; pre-save hook will hash it)
    const user = await User.create({
      email,
      passwordHash: password,
      fullName: trimmedFullName,
      displayName: trimmedDisplayName,
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: err.message,
      });
    }
    next(err);
  }
};

/**
 * Login a user
 * @route POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_MISSING_FIELD',
        message: 'Email and password are required',
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
};

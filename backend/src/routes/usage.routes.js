'use strict';

const express = require('express');
const { getUsageAnalytics } = require('../controllers/usage.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// All usage routes require authentication
router.use(authenticate);

// GET /api/usage
router.get('/', getUsageAnalytics);

module.exports = router;

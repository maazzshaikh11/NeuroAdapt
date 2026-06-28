'use strict';

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All analytics routes are protected
router.use(authenticate);

// GET /api/analytics/overview
router.get('/overview', analyticsController.getAnalyticsOverview);

module.exports = router;

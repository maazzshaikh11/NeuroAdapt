'use strict';

const express = require('express');
const { simplifyController } = require('../controllers/simplify.controller');
const { optionalAuthenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// POST /api/simplify — auth optional; req.user set when JWT is valid
router.post('/', optionalAuthenticate, simplifyController);

module.exports = router;

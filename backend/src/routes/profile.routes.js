'use strict';

/**
 * Profile Routes — NeuroAdapt Backend
 *
 * GET  /api/profile          → Return authenticated user's profile
 * PUT  /api/profile          → Update user's profile fields
 * POST /api/profile/avatar   → Upload a new avatar image (multipart/form-data)
 *
 * All routes are protected by the authenticate middleware (JWT).
 */

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const crypto  = require('crypto');
const { authenticate } = require('../middleware/auth.middleware');
const { getProfile, updateProfile, uploadAvatar } = require('../controllers/profile.controller');

const router = express.Router();

// ── Multer storage configuration ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../public/uploads'),
  filename(_req, file, cb) {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString('hex');
    cb(null, `avatar-${name}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  cb(null, allowed.includes(file.mimetype));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// ── All profile routes require a valid JWT ────────────────────────────────────
router.use(authenticate);

// GET /api/profile
router.get('/', getProfile);

// PUT /api/profile
router.put('/', updateProfile);

// PATCH /api/profile
router.patch('/', updateProfile);

// POST /api/profile/avatar  (multipart/form-data — field name: "avatar")
router.post('/avatar', upload.single('avatar'), uploadAvatar);

module.exports = router;

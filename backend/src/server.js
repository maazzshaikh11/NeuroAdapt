'use strict';

// ─── Load environment variables FIRST ─────────────────────────────────────────
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const corsOptions = require('./config/cors');
const { authLimiter, simplifyLimiter } = require('./config/rateLimit');
const errorHandler = require('./middleware/errorHandler');
const connectDB = require('./config/db');
const path = require('path');

const app = express();

// Required for Render + express-rate-limit
app.set('trust proxy', 1);

// ─── Core Middleware ──────────────────────────────────────────────────────────

// Security headers
app.use(helmet());

// CORS
app.use(cors(corsOptions));

// Parse request bodies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
// Rate limiting
// app.use('/api/auth', authLimiter);
app.use('/api/simplify', simplifyLimiter);

// ──────────────────────────────────────────────────────────────────────────────
// Root Endpoint
// Visiting https://neuroadapt-backend.onrender.com/
// will display API information instead of a 404.
// ──────────────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    name: 'NeuroAdapt Backend API',
    version: '1.0.0',
    status: 'Running',
    message: 'Welcome to the NeuroAdapt Backend API.',
    dashboard: 'https://neuro-adapt-eight.vercel.app',
    documentation: 'https://github.com/maazzshaikh11/NeuroAdapt',
    health: '/health',
    endpoints: {
      register: '/api/auth/register',
      login: '/api/auth/login',
      profile: '/api/profile',
      simplify: '/api/simplify',
      analytics: '/api/analytics',
      usage: '/api/usage'
    }
  });
});

// ─── Health Check Endpoint ───────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'NeuroAdapt API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const simplifyRoutes = require('./routes/simplify.routes');
const usageRoutes = require('./routes/usage.routes');
const analyticsRoutes = require('./routes/analytics.routes');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/simplify', simplifyRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/analytics', analyticsRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: 'The requested endpoint does not exist.',
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '5000', 10);

(async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `[Server] ✅ NeuroAdapt API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`
      );
    });
  } catch (err) {
    console.error('[Server] ❌ Failed to start:', err.message);
    process.exit(1);
  }
})();

module.exports = app;

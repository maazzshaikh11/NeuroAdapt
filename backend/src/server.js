'use strict';

// ─── Load environment variables FIRST ─────────────────────────────────────────
// dotenv must be called before any other require() that reads process.env.
// This is especially important for MONGODB_URI used in connectDB().
require('dotenv').config();

const express  = require('express');
const helmet = require('helmet');
const cors = require('cors');
const corsOptions = require('./config/cors');
const { authLimiter, simplifyLimiter } = require('./config/rateLimit');
const errorHandler = require('./middleware/errorHandler');
const connectDB = require('./config/db');
const path = require('path');

// ─── App Instantiation ────────────────────────────────────────────────────────
const app = express();

// ─── Core Middleware ──────────────────────────────────────────────────────────

// 1. Helmet
app.use(helmet());

// 2. CORS
app.use(cors(corsOptions));

// 3. express.json
// Parse incoming JSON bodies (for POST/PUT request payloads).
// Limit: 1mb — prevents trivially large payload attacks.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// 4. Rate Limiters
// In the future: app.use('/auth', authLimiter);
app.use('/api/simplify', simplifyLimiter);

// ─── Health Check Endpoint ───────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'NeuroAdapt API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── API Routes (5. routes) ───────────────────────────────────────────────────
// Routes will be mounted here as they are implemented in subsequent tickets.
// Example (added when Ticket 2.x is implemented):
const authRoutes     = require('./routes/auth.routes');
const profileRoutes  = require('./routes/profile.routes');
const simplifyRoutes = require('./routes/simplify.routes');
const usageRoutes    = require('./routes/usage.routes');
const analyticsRoutes = require('./routes/analytics.routes');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/simplify', simplifyRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/analytics', analyticsRoutes);

// ─── 404 Handler (6. 404 handler) ────────────────────────────────────────────
// Catches any request that didn't match a defined route.
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    code:    'NOT_FOUND',
    message: 'The requested endpoint does not exist.',
  });
});

// ─── Global Error Handler (7. global error handler) ───────────────────────────
app.use(errorHandler);

// ─── Bootstrap — Connect DB then Start Server ─────────────────────────────────
const PORT = parseInt(process.env.PORT || '5000', 10);

(async () => {
  try {
    // connectDB() will process.exit(1) if the connection fails.
    // The server never starts listening without a healthy DB connection.
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `[Server] ✅ NeuroAdapt API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`
      );
    });
  } catch (err) {
    // Catch block handles any unexpected error not caught inside connectDB().
    console.error('[Server] ❌ Failed to start:', err.message);
    process.exit(1);
  }
})();

// Export app for future test use (e.g. supertest in Ticket 10.x)
module.exports = app;

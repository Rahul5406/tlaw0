const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./backend/config');
const { runMigrations } = require('./backend/database/migrations');
const { seedDatabase } = require('./backend/database/seed');
const { queryOne } = require('./backend/database/db');

// Initialize database schema and verify seed data on boot
try {
  runMigrations();
  const userCheck = queryOne('SELECT COUNT(*) as c FROM users');
  if (!userCheck || userCheck.c === 0) {
    console.log('[BOOT] Database is empty. Seeding defaults...');
    seedDatabase().catch(err => console.error('[BOOT SEED ERROR]', err));
  }
} catch (e) {
  console.error('[BOOT ERROR]', e);
}

const app = express();

// Security and utility middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve frontend static assets
app.use(express.static(config.FRONTEND_DIR));
app.use(express.static(path.join(config.FRONTEND_DIR, 'public')));
app.use('/public', express.static(path.join(config.FRONTEND_DIR, 'public')));
app.use('/uploads', express.static(config.UPLOADS_DIR));

// API Routes
app.use('/api/auth', require('./backend/routes/auth.routes'));
app.use('/api/event', require('./backend/routes/event.routes'));
app.use('/api/case', require('./backend/routes/case.routes'));
app.use('/api/evidence', require('./backend/routes/evidence.routes'));
app.use('/api/suspects', require('./backend/routes/suspects.routes'));
app.use('/api/workspace', require('./backend/routes/workspace.routes'));
app.use('/api/report', require('./backend/routes/report.routes'));
app.use('/api/leaderboard', require('./backend/routes/leaderboard.routes'));
app.use('/api/admin', require('./backend/routes/admin.routes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OPERATIONAL',
    case_id: 'TLA-026',
    system: 'CyRA Digital Forensics Platform',
    timestamp: new Date().toISOString()
  });
});

// SPA fallback for HTML5 History API routing
app.use((req, res) => {
  // If requesting an unknown API route, return 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(config.FRONTEND_DIR, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred.'
  });
});

let server = null;
if (require.main === module) {
  server = app.listen(config.PORT, () => {
    console.log(`================================================================`);
    console.log(`  THE LAST ARTIFACT (TLA-026) - CYRA FORENSIC INVESTIGATION`);
    console.log(`  Server online at: http://localhost:${config.PORT}`);
    console.log(`  Mode: Full-Stack Integrated Forensics Portal`);
    console.log(`================================================================`);
  });
}

module.exports = { app, server };

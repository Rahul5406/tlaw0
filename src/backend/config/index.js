const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'cyra-tla026-super-secure-investigation-key-2026',
  DB_PATH: path.join(__dirname, '..', '..', '..', 'data', 'tla_forensics.db'),
  UPLOADS_DIR: path.join(__dirname, '..', '..', '..', 'data', 'uploads'),
  FRONTEND_DIR: path.join(__dirname, '..', '..', 'frontend'),
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB per file
  MAX_UPLOAD_FILES: 10, // up to 10 files in a single batch
  ALLOWED_EXTENSIONS: ['.txt', '.csv', '.pdf', '.jpg', '.jpeg', '.png', '.mp4', '.zip', '.wav'],
  DEFAULT_CASE_ID: 'TLA-026',
  DEFAULT_DURATION_MINUTES: 180, // 3 hours
  DEFAULT_GRACE_PERIOD_MINUTES: 5,
  DEFAULT_WARNING_MINUTES: 15
};

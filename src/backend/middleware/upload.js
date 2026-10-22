const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config');

// Ensure upload directory exists
if (!fs.existsSync(config.UPLOADS_DIR)) {
  fs.mkdirSync(config.UPLOADS_DIR, { recursive: true });
}

function sanitizeFileName(name) {
  // Strip path traversal characters and dangerous control chars
  const base = path.basename(name);
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const cleanName = sanitizeFileName(file.originalname);
    const uniquePrefix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    cb(null, `${uniquePrefix}_${cleanName}`);
  }
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (config.ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type '${ext}' is not permitted. Permitted formats: ${config.ALLOWED_EXTENSIONS.join(', ')}`));
  }
}

const upload = multer({
  storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE, // 50MB
    files: config.MAX_UPLOAD_FILES // max 10 files per batch
  },
  fileFilter
});

// Wrapper to handle Multer errors with proper JSON response
function handleUpload(uploadMiddleware) {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: `File too large. Maximum allowed size is ${config.MAX_FILE_SIZE / (1024 * 1024)}MB.` });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: `Too many files. Maximum allowed per batch is ${config.MAX_UPLOAD_FILES}.` });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  };
}

module.exports = {
  upload,
  handleUpload,
  sanitizeFileName
};

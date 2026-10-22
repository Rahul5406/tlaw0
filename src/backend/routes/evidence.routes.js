const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { queryOne, queryAll } = require('../database/db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { logAuditEvent } = require('../middleware/audit');
const { requireSectionEnabled } = require('../middleware/sectionVisibility');

// Enforce admin-controlled section visibility for non-admin requests
router.use(optionalAuth, requireSectionEnabled('nav_vault_visible'));

// GET /api/evidence - List all available evidence items
router.get('/', (req, res) => {

  try {
    const { category, search, classification } = req.query;
    let sql = `
      SELECT id, evidence_code, display_name, original_filename, file_type,
             mime_type, file_size, sha256_hash, category, classification,
             description, hints, score_value, is_available, uploaded_at
      FROM evidence
      WHERE archived = 0 AND is_available = 1
    `;
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (classification) {
      sql += ' AND classification = ?';
      params.push(classification);
    }
    if (search) {
      sql += ' AND (display_name LIKE ? OR description LIKE ? OR evidence_code LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY id ASC';
    const items = queryAll(sql, params);

    // Get categories for filtering
    const categories = queryAll('SELECT DISTINCT category FROM evidence WHERE archived = 0');

    res.json({
      evidence: items,
      categories: categories.map(c => c.category)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve evidence records.' });
  }
});

// GET /api/evidence/:id - Details of single evidence item
router.get('/:id', (req, res) => {
  try {
    const item = queryOne(`
      SELECT id, evidence_code, display_name, original_filename, file_type,
             mime_type, file_size, sha256_hash, category, classification,
             description, hints, score_value, is_available, uploaded_at
      FROM evidence
      WHERE id = ? AND archived = 0
    `, [req.params.id]);

    if (!item) {
      return res.status(404).json({ error: 'Evidence item not found.' });
    }

    res.json({ evidence: item });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve evidence item.' });
  }
});

// GET /api/evidence/:id/download - Secure authenticated download
router.get('/:id/download', requireAuth, (req, res) => {
  try {
    const item = queryOne(`
      SELECT id, evidence_code, original_filename, stored_filename, mime_type
      FROM evidence
      WHERE id = ? AND archived = 0 AND is_available = 1
    `, [req.params.id]);

    if (!item) {
      return res.status(404).json({ error: 'Evidence item not found or unavailable.' });
    }

    const filePath = path.join(config.UPLOADS_DIR, item.stored_filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Evidence file is physically missing from secure storage.' });
    }

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'EVIDENCE_DOWNLOAD',
      targetObject: `EVIDENCE:${item.evidence_code}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      details: { filename: item.original_filename }
    });

    res.download(filePath, item.original_filename);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download evidence file.' });
  }
});

// GET /api/evidence/:id/preview - Secure preview stream or text payload
router.get('/:id/preview', requireAuth, (req, res) => {
  try {
    const item = queryOne(`
      SELECT id, evidence_code, original_filename, stored_filename, file_type, mime_type
      FROM evidence
      WHERE id = ? AND archived = 0 AND is_available = 1
    `, [req.params.id]);

    if (!item) {
      return res.status(404).json({ error: 'Evidence item not found or unavailable.' });
    }

    const filePath = path.join(config.UPLOADS_DIR, item.stored_filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Evidence file not found in storage.' });
    }

    // For text and csv, we can also return raw text content
    if (req.query.format === 'text' || item.file_type === 'text' || item.file_type === 'csv') {
      const content = fs.readFileSync(filePath, 'utf8');
      return res.json({
        evidence_code: item.evidence_code,
        filename: item.original_filename,
        file_type: item.file_type,
        content
      });
    }

    // Otherwise stream binary directly with appropriate content-type
    res.setHeader('Content-Type', item.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${item.original_filename}"`);
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to preview evidence file.' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { queryAll, queryOne, run, transaction } = require('../database/db');
const { requireAdmin } = require('../middleware/auth');
const { upload, handleUpload, sanitizeFileName } = require('../middleware/upload');
const { calculateFileSha256 } = require('../utils/hasher');
const { logAuditEvent } = require('../middleware/audit');

// All admin routes strictly require admin role
router.use(requireAdmin);

// ============================================================================
// MODULE A: ADMIN DASHBOARD METRICS
// ============================================================================
router.get('/metrics', (req, res) => {
  try {
    const totalParticipants = queryOne("SELECT COUNT(*) as c FROM users WHERE role = 'participant'").c;
    const totalTeams = queryOne("SELECT COUNT(*) as c FROM teams").c;
    const activeInvestigations = queryOne("SELECT COUNT(*) as c FROM case_sessions WHERE status = 'in_progress'").c;
    const completedInvestigations = queryOne("SELECT COUNT(*) as c FROM final_reports").c;
    const pendingReviews = queryOne("SELECT COUNT(*) as c FROM final_reports WHERE status IN ('submitted', 'late')").c;
    const evidenceCount = queryOne("SELECT COUNT(*) as c FROM evidence WHERE archived = 0").c;

    const recentSubmissions = queryAll(`
      SELECT fr.id, fr.report_code, fr.word_count, fr.status, fr.submitted_at,
             u.full_name as author_name, t.name as team_name
      FROM final_reports fr
      JOIN users u ON fr.user_id = u.id
      LEFT JOIN teams t ON fr.team_id = t.id
      ORDER BY fr.submitted_at DESC
      LIMIT 5
    `);

    const recentAudit = queryAll(`
      SELECT id, timestamp, actor_name, actor_role, action, target_object, outcome
      FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT 6
    `);

    const eventStatus = queryOne("SELECT value FROM event_config WHERE key = 'site_title'").value;

    res.json({
      metrics: {
        total_participants: totalParticipants,
        total_teams: totalTeams,
        active_investigations: activeInvestigations,
        completed_investigations: completedInvestigations,
        pending_reviews: pendingReviews,
        evidence_count: evidenceCount,
        event_status: 'ACTIVE - Case TLA-026 Live'
      },
      recent_submissions: recentSubmissions,
      recent_activity: recentAudit
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load admin metrics.' });
  }
});

// ============================================================================
// MODULE B: WEBSITE CUSTOMIZER / CONFIGURATION
// ============================================================================
router.get('/config', (req, res) => {
  try {
    const rows = queryAll('SELECT key, value, description FROM event_config');
    const configMap = {};
    for (const r of rows) configMap[r.key] = r.value;
    res.json({ config: configMap });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve configuration.' });
  }
});

router.put('/config', (req, res) => {
  try {
    const { updates } = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid configuration payload.' });
    }

    transaction(() => {
      for (const [key, value] of Object.entries(updates)) {
        run(`
          INSERT INTO event_config (key, value, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = CURRENT_TIMESTAMP
        `, [key, String(value)]);
      }
    });

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'WEBSITE_CONFIG_UPDATE',
      targetObject: 'EVENT_CONFIG',
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      details: { keysUpdated: Object.keys(updates) }
    });

    res.json({ message: 'Website configuration updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update website configuration.' });
  }
});

// ============================================================================
// MODULE C: EVENT RULES & INSTRUCTIONS EDITOR
// ============================================================================
router.get('/rules', (req, res) => {
  try {
    const rules = queryAll('SELECT * FROM event_rules ORDER BY sort_order ASC');
    res.json({ rules });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load rules.' });
  }
});

router.post('/rules', (req, res) => {
  try {
    const { section_key, title, content, sort_order, is_active } = req.body;
    if (!section_key || !title || !content) {
      return res.status(400).json({ error: 'Section key, title, and content are required.' });
    }

    const order = sort_order ? parseInt(sort_order, 10) : 10;
    run(`
      INSERT INTO event_rules (section_key, title, content, sort_order, is_active, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [section_key.trim(), title.trim(), content.trim(), order, is_active ? 1 : 0]);

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'RULE_CREATED',
      targetObject: `RULE:${section_key}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip
    });

    res.status(201).json({ message: 'Event rule added.' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create rule.' });
  }
});

router.put('/rules/:id', (req, res) => {
  try {
    const { title, content, sort_order, is_active } = req.body;
    run(`
      UPDATE event_rules
      SET title = COALESCE(?, title),
          content = COALESCE(?, content),
          sort_order = COALESCE(?, sort_order),
          is_active = COALESCE(?, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, content, sort_order, is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id]);

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'RULE_UPDATED',
      targetObject: `RULE:${req.params.id}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip
    });

    res.json({ message: 'Rule updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update rule.' });
  }
});

router.delete('/rules/:id', (req, res) => {
  try {
    run('DELETE FROM event_rules WHERE id = ?', [req.params.id]);
    res.json({ message: 'Rule deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete rule.' });
  }
});

// ============================================================================
// MODULE E: CASE STORY EDITOR
// ============================================================================
router.get('/story', (req, res) => {
  try {
    const sections = queryAll('SELECT * FROM case_story_sections ORDER BY sort_order ASC');
    const attachments = queryAll(`
      SELECT csa.*, ev.evidence_code
      FROM case_story_attachments csa
      LEFT JOIN evidence ev ON csa.evidence_id = ev.id
      ORDER BY csa.id ASC
    `);
    const attachMap = {};
    for (const a of attachments) {
      if (!attachMap[a.story_id]) attachMap[a.story_id] = [];
      attachMap[a.story_id].push(a);
    }
    const withAttachments = sections.map(s => ({
      ...s,
      attachments: attachMap[s.id] || []
    }));
    res.json({ sections: withAttachments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load story sections.' });
  }
});

router.post('/story', (req, res) => {
  try {
    const { section_id, title, subtitle, content, badge, classification, sort_order, is_published } = req.body;
    if (!section_id || !title || !content) {
      return res.status(400).json({ error: 'Section ID, title, and content are required.' });
    }

    const runRes = run(`
      INSERT INTO case_story_sections (
        section_id, title, subtitle, content, badge, classification,
        sort_order, is_published, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      section_id.trim(),
      title.trim(),
      subtitle || '',
      content.trim(),
      badge || 'CONFIDENTIAL',
      classification || 'RESTRICTED',
      sort_order ? parseInt(sort_order, 10) : 10,
      is_published !== undefined ? (is_published ? 1 : 0) : 1
    ]);

    const storyId = Number(runRes.lastInsertRowid);

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'STORY_SECTION_CREATED',
      targetObject: `STORY:${section_id}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip
    });

    res.status(201).json({
      message: 'Story section created.',
      id: storyId,
      section_id: section_id.trim()
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create story section.' });
  }
});

router.put('/story/:id', (req, res) => {
  try {
    const { title, subtitle, content, badge, classification, sort_order, is_published } = req.body;
    run(`
      UPDATE case_story_sections
      SET title = COALESCE(?, title),
          subtitle = COALESCE(?, subtitle),
          content = COALESCE(?, content),
          badge = COALESCE(?, badge),
          classification = COALESCE(?, classification),
          sort_order = COALESCE(?, sort_order),
          is_published = COALESCE(?, is_published),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title,
      subtitle,
      content,
      badge,
      classification,
      sort_order,
      is_published !== undefined ? (is_published ? 1 : 0) : null,
      req.params.id
    ]);

    res.json({ message: 'Story section updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update story section.' });
  }
});

router.delete('/story/:id', (req, res) => {
  try {
    run('DELETE FROM case_story_attachments WHERE story_id = ?', [req.params.id]);
    run('DELETE FROM case_story_sections WHERE id = ?', [req.params.id]);
    res.json({ message: 'Story section deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete story section.' });
  }
});


// GET /api/admin/story/:id/attachments
router.get('/story/:id/attachments', (req, res) => {
  try {
    const attachments = queryAll(`
      SELECT csa.*, ev.evidence_code
      FROM case_story_attachments csa
      LEFT JOIN evidence ev ON csa.evidence_id = ev.id
      WHERE csa.story_id = ?
      ORDER BY csa.id ASC
    `, [req.params.id]);
    res.json({ attachments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load story attachments.' });
  }
});

// POST /api/admin/story/:id/attachments - Upload attachments for a story section
router.post('/story/:id/attachments', handleUpload(upload.array('files', 10)), (req, res) => {
  try {
    const storyId = req.params.id;
    const section = queryOne('SELECT id, section_id, title FROM case_story_sections WHERE id = ?', [storyId]);
    if (!section) {
      return res.status(404).json({ error: 'Case story section not found.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided for attachment.' });
    }

    const savedAttachments = [];
    transaction(() => {
      for (const file of req.files) {
        const ext = path.extname(file.originalname).toLowerCase();
        let fileType = 'text';
        if (ext === '.csv') fileType = 'csv';
        else if (ext === '.pdf') fileType = 'pdf';
        else if (['.jpg', '.jpeg', '.png'].includes(ext)) fileType = 'image';
        else if (ext === '.mp4') fileType = 'video';
        else if (ext === '.wav' || ext === '.mp3') fileType = 'audio';
        else if (ext === '.zip') fileType = 'archive';

        const sha256 = calculateFileSha256(file.path) || 'n/a';
        const evidenceCode = `EVD-026-STORY-${Date.now().toString().slice(-4)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        const displayName = path.basename(file.originalname, ext).replace(/[_-]/g, ' ');

        // Create an evidence record to integrate with the evidence system
        const evRes = run(`
          INSERT INTO evidence (
            evidence_code, display_name, original_filename, stored_filename,
            file_path, file_type, mime_type, file_size, sha256_hash,
            category, classification, description, score_value, visibility_rule,
            is_available, case_id, uploaded_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Case Story Evidence', 'CRITICAL', ?, 10, 'immediate', 1, 'TLA-026', CURRENT_TIMESTAMP)
        `, [
          evidenceCode,
          displayName,
          file.originalname,
          file.filename,
          file.filename,
          fileType,
          file.mimetype || 'application/octet-stream',
          file.size,
          sha256,
          `Attached forensic evidence for story section: ${section.title}`
        ]);
        const evidenceId = Number(evRes.lastInsertRowid);

        // Record attachment relation
        const attRes = run(`
          INSERT INTO case_story_attachments (
            story_id, evidence_id, original_filename, stored_filename,
            file_path, file_type, mime_type, file_size, sha256_hash, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          storyId,
          evidenceId,
          file.originalname,
          file.filename,
          file.filename,
          fileType,
          file.mimetype || 'application/octet-stream',
          file.size,
          sha256
        ]);

        savedAttachments.push({
          id: Number(attRes.lastInsertRowid),
          story_id: Number(storyId),
          evidence_id: evidenceId,
          evidence_code: evidenceCode,
          original_filename: file.originalname,
          stored_filename: file.filename,
          file_type: fileType,
          mime_type: file.mimetype || 'application/octet-stream',
          file_size: file.size,
          sha256_hash: sha256
        });
      }
    });

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'STORY_ATTACHMENTS_UPLOADED',
      targetObject: `STORY:${section.section_id}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      details: {
        storyId,
        files: savedAttachments.map(a => a.original_filename),
        count: savedAttachments.length
      }
    });

    res.status(201).json({
      message: `Successfully uploaded ${savedAttachments.length} evidence attachment(s).`,
      attachments: savedAttachments
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to upload story attachments.' });
  }
});

// DELETE /api/admin/story/:id/attachments/:attachmentId
router.delete('/story/:id/attachments/:attachmentId', (req, res) => {
  try {
    const { id: storyId, attachmentId } = req.params;
    const att = queryOne(`
      SELECT id, story_id, evidence_id, original_filename
      FROM case_story_attachments
      WHERE id = ? AND story_id = ?
    `, [attachmentId, storyId]);

    if (!att) {
      return res.status(404).json({ error: 'Attachment record not found for this story section.' });
    }

    // Delete attachment record (preserves the physical evidence file and evidence record)
    run('DELETE FROM case_story_attachments WHERE id = ?', [attachmentId]);

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'STORY_ATTACHMENT_REMOVED',
      targetObject: `STORY:${storyId}:ATT:${attachmentId}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      details: { original_filename: att.original_filename, evidence_id: att.evidence_id }
    });

    res.json({ message: 'Attachment successfully removed from case story section.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove story attachment.' });
  }
});

// ============================================================================
// MODULE F: EVIDENCE MANAGER (Single & Multiple File Uploads)
// ============================================================================
router.get('/evidence', (req, res) => {
  try {
    const evidence = queryAll('SELECT * FROM evidence ORDER BY archived ASC, id ASC');
    res.json({ evidence });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load evidence records.' });
  }
});

// MULTIPLE-FILE UPLOAD ENDPOINT
// Meets all requirements of Section 8: supports 3-4+ files, validates per-file, preserves existing files
router.post('/evidence/upload', handleUpload(upload.array('files', 10)), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded. Please select one or more files.' });
    }

    const {
      category = 'System Logs',
      classification = 'SECONDARY',
      description = '',
      score_value = 10
    } = req.body;

    const uploadedRecords = [];
    const errors = [];

    transaction(() => {
      for (const file of req.files) {
        try {
          const ext = path.extname(file.originalname).toLowerCase();
          let fileType = 'text';
          if (ext === '.csv') fileType = 'csv';
          else if (ext === '.pdf') fileType = 'pdf';
          else if (['.jpg', '.jpeg', '.png'].includes(ext)) fileType = 'image';
          else if (ext === '.mp4') fileType = 'video';
          else if (ext === '.wav' || ext === '.mp3') fileType = 'audio';
          else if (ext === '.zip') fileType = 'archive';

          const sha256 = calculateFileSha256(file.path);
          const evidenceCode = `EVD-026-B${Date.now().toString().slice(-4)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
          const displayName = path.basename(file.originalname, ext).replace(/[_-]/g, ' ');

          run(`
            INSERT INTO evidence (
              evidence_code, display_name, original_filename, stored_filename,
              file_path, file_type, mime_type, file_size, sha256_hash,
              category, classification, description, score_value, visibility_rule,
              is_available, case_id, uploaded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'immediate', 1, 'TLA-026', CURRENT_TIMESTAMP)
          `, [
            evidenceCode,
            displayName,
            file.originalname,
            file.filename,
            file.filename,
            fileType,
            file.mimetype || 'application/octet-stream',
            file.size,
            sha256 || 'n/a',
            category,
            classification,
            description || `Evidence file: ${file.originalname}`,
            parseInt(score_value, 10) || 10
          ]);

          uploadedRecords.push({
            original_filename: file.originalname,
            evidence_code: evidenceCode,
            size: file.size,
            sha256
          });
        } catch (itemErr) {
          errors.push({ filename: file.originalname, error: itemErr.message });
        }
      }
    });

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'EVIDENCE_BATCH_UPLOAD',
      targetObject: `EVIDENCE_BATCH:${uploadedRecords.length}_FILES`,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      details: { count: uploadedRecords.length, files: uploadedRecords.map(r => r.original_filename) }
    });

    res.status(201).json({
      message: `Successfully uploaded ${uploadedRecords.length} evidence file(s). Existing collection preserved.`,
      uploaded: uploadedRecords,
      errors: errors.length > 0 ? errors : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Evidence upload failed.' });
  }
});

// Update evidence metadata
router.put('/evidence/:id', (req, res) => {
  try {
    const { display_name, category, classification, description, hints, score_value, is_available } = req.body;
    run(`
      UPDATE evidence
      SET display_name = COALESCE(?, display_name),
          category = COALESCE(?, category),
          classification = COALESCE(?, classification),
          description = COALESCE(?, description),
          hints = COALESCE(?, hints),
          score_value = COALESCE(?, score_value),
          is_available = COALESCE(?, is_available),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      display_name,
      category,
      classification,
      description,
      hints,
      score_value,
      is_available !== undefined ? (is_available ? 1 : 0) : null,
      req.params.id
    ]);

    res.json({ message: 'Evidence details updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update evidence metadata.' });
  }
});

// Archive evidence (safe non-destructive archival preserving report citations)
router.post('/evidence/:id/archive', (req, res) => {
  try {
    const item = queryOne('SELECT evidence_code, archived FROM evidence WHERE id = ?', [req.params.id]);
    if (!item) return res.status(404).json({ error: 'Evidence item not found.' });

    const newArchived = item.archived ? 0 : 1;
    run('UPDATE evidence SET archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newArchived, req.params.id]);

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: newArchived ? 'EVIDENCE_ARCHIVED' : 'EVIDENCE_UNARCHIVED',
      targetObject: `EVIDENCE:${item.evidence_code}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip
    });

    res.json({ message: newArchived ? 'Evidence archived.' : 'Evidence restored.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle archival state.' });
  }
});

// ============================================================================
// MODULE G: SUSPECT PROFILE MANAGER
// ============================================================================
router.get('/suspects', (req, res) => {
  try {
    const suspects = queryAll('SELECT * FROM suspects ORDER BY id ASC');
    res.json({ suspects });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load suspects.' });
  }
});

router.post('/suspects/upload-avatar', handleUpload(upload.any()), (req, res) => {
  try {
    const file = req.file || (req.files && req.files[0]);
    if (!file) {
      return res.status(400).json({ error: 'No avatar image file provided.' });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const allowedImageExts = ['.jpg', '.jpeg', '.png', '.webp'];
    if (!allowedImageExts.includes(ext)) {
      try { fs.unlinkSync(file.path); } catch (e) {}
      return res.status(400).json({ error: `Invalid image type '${ext}'. Permitted image formats: ${allowedImageExts.join(', ')}` });
    }

    const destDir = path.join(config.FRONTEND_DIR, 'assets', 'images', 'suspects');
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const avatarFileName = `suspect_${Date.now()}_${sanitizeFileName(file.originalname)}`;
    const destPath = path.join(destDir, avatarFileName);
    fs.copyFileSync(file.path, destPath);

    const avatarUrl = `/assets/images/suspects/${avatarFileName}`;

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'SUSPECT_AVATAR_UPLOAD',
      targetObject: `FILE:${avatarFileName}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      details: { originalFilename: file.originalname, avatarUrl, size: file.size }
    });

    res.json({
      message: 'Suspect profile image uploaded successfully.',
      avatar_url: avatarUrl,
      filename: avatarFileName
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to process avatar upload.' });
  }
});

router.post('/suspects', (req, res) => {
  try {
    const { suspect_code, name, role, department, avatar_url, relationships, statement, whereabouts, timeline_events, potential_motive, supporting_evidence, is_visible } = req.body;
    if (!name || !name.trim() || !role || !role.trim()) {
      return res.status(400).json({ error: 'Full name and project role are required.' });
    }

    let code = (suspect_code && suspect_code.trim()) ? suspect_code.trim().toUpperCase() : null;
    if (!code) {
      const rows = queryAll('SELECT suspect_code FROM suspects');
      let highestNum = 0;
      for (const r of rows) {
        const match = r.suspect_code && r.suspect_code.match(/^SUSP-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > highestNum) highestNum = num;
        }
      }
      let nextNum = highestNum + 1;
      code = `SUSP-${String(nextNum).padStart(2, '0')}`;
      while (queryOne('SELECT id FROM suspects WHERE suspect_code = ?', [code])) {
        nextNum++;
        code = `SUSP-${String(nextNum).padStart(2, '0')}`;
      }
    } else {
      const existing = queryOne('SELECT id FROM suspects WHERE suspect_code = ?', [code]);
      if (existing) {
        return res.status(400).json({ error: `Suspect code '${code}' already exists.` });
      }
    }

    const defaultAvatar = '/assets/images/suspects/default_suspect.svg';
    const finalAvatar = avatar_url && avatar_url.trim() ? avatar_url.trim() : defaultAvatar;

    const result = run(`
      INSERT INTO suspects (
        suspect_code, name, role, department, avatar_url, relationships,
        statement, whereabouts, timeline_events, potential_motive,
        supporting_evidence, is_visible, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      code,
      name.trim(),
      role.trim(),
      department ? department.trim() : 'ARCH Project Team',
      finalAvatar,
      relationships ? relationships.trim() : '',
      statement ? statement.trim() : '',
      whereabouts ? whereabouts.trim() : '',
      timeline_events ? timeline_events.trim() : '',
      potential_motive ? potential_motive.trim() : '',
      supporting_evidence ? supporting_evidence.trim() : '',
      is_visible !== undefined ? (is_visible ? 1 : 0) : 1
    ]);

    const created = queryOne('SELECT * FROM suspects WHERE id = ?', [result.lastInsertRowid]);

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'SUSPECT_DOSSIER_CREATED',
      targetObject: `SUSPECT:${code}:${name.trim()}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      details: { suspectId: created.id, suspectCode: code, name: name.trim(), role: role.trim() }
    });

    res.status(201).json({
      message: 'Suspect profile created successfully.',
      suspect: created
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create suspect.' });
  }
});

router.put('/suspects/:id', (req, res) => {
  try {
    const existing = queryOne('SELECT * FROM suspects WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Suspect profile not found.' });
    }

    const { name, role, department, avatar_url, relationships, statement, whereabouts, timeline_events, potential_motive, supporting_evidence, is_visible } = req.body;
    
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'Full name cannot be empty.' });
    }
    if (role !== undefined && !role.trim()) {
      return res.status(400).json({ error: 'Project role cannot be empty.' });
    }

    run(`
      UPDATE suspects
      SET name = COALESCE(?, name),
          role = COALESCE(?, role),
          department = COALESCE(?, department),
          avatar_url = COALESCE(?, avatar_url),
          relationships = COALESCE(?, relationships),
          statement = COALESCE(?, statement),
          whereabouts = COALESCE(?, whereabouts),
          timeline_events = COALESCE(?, timeline_events),
          potential_motive = COALESCE(?, potential_motive),
          supporting_evidence = COALESCE(?, supporting_evidence),
          is_visible = COALESCE(?, is_visible),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name !== undefined ? name.trim() : null,
      role !== undefined ? role.trim() : null,
      department !== undefined ? department.trim() : null,
      avatar_url !== undefined ? avatar_url.trim() : null,
      relationships !== undefined ? relationships.trim() : null,
      statement !== undefined ? statement.trim() : null,
      whereabouts !== undefined ? whereabouts.trim() : null,
      timeline_events !== undefined ? timeline_events.trim() : null,
      potential_motive !== undefined ? potential_motive.trim() : null,
      supporting_evidence !== undefined ? supporting_evidence.trim() : null,
      is_visible !== undefined ? (is_visible ? 1 : 0) : null,
      req.params.id
    ]);

    const updated = queryOne('SELECT * FROM suspects WHERE id = ?', [req.params.id]);

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'SUSPECT_DOSSIER_UPDATED',
      targetObject: `SUSPECT:${existing.suspect_code}:${updated.name}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      details: { suspectId: req.params.id, name: updated.name }
    });

    res.json({ message: 'Suspect profile updated.', suspect: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update suspect.' });
  }
});

router.delete('/suspects/:id', (req, res) => {
  try {
    const suspect = queryOne('SELECT * FROM suspects WHERE id = ?', [req.params.id]);
    if (!suspect) {
      return res.status(404).json({ error: 'Suspect dossier not found.' });
    }

    // Preserve investigator timeline entries by decoupling suspect association without deleting records
    run('UPDATE investigation_timeline SET associated_suspect = NULL WHERE associated_suspect = ? OR associated_suspect = ?', [suspect.name, suspect.suspect_code]);

    run('DELETE FROM suspects WHERE id = ?', [req.params.id]);

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'SUSPECT_DOSSIER_DELETED',
      targetObject: `SUSPECT:${suspect.suspect_code}:${suspect.name}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      details: { deletedId: suspect.id, suspectCode: suspect.suspect_code, name: suspect.name }
    });

    res.json({ message: `Suspect dossier for ${suspect.name} (${suspect.suspect_code}) deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete suspect.' });
  }
});

// ============================================================================
// MODULE H: SCORE BOARD & LEADERBOARD MANAGEMENT
// ============================================================================
router.put('/scoreboard/:id', (req, res) => {
  try {
    const { total_score, penalty } = req.body;
    const scoreItem = queryOne('SELECT * FROM leaderboard_scores WHERE id = ?', [req.params.id]);
    if (!scoreItem) return res.status(404).json({ error: 'Score record not found.' });

    const newTotal = total_score !== undefined ? parseFloat(total_score) : scoreItem.total_score;
    const newPenalty = penalty !== undefined ? parseFloat(penalty) : scoreItem.penalty;
    const finalScore = Math.max(0, newTotal - newPenalty);

    run(`
      UPDATE leaderboard_scores
      SET total_score = ?,
          penalty = ?,
          final_score = ?,
          last_updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newTotal, newPenalty, finalScore, req.params.id]);

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'SCORE_ADJUSTMENT',
      targetObject: `SCORE:${req.params.id}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      details: { previous: scoreItem.final_score, newFinal: finalScore }
    });

    res.json({ message: 'Score record updated.', final_score: finalScore });
  } catch (err) {
    res.status(500).json({ error: 'Failed to adjust score.' });
  }
});

// ============================================================================
// MODULE I: TEAM MANAGEMENT
// ============================================================================
router.get('/teams', (req, res) => {
  try {
    const teams = queryAll(`
      SELECT t.*, u.full_name as leader_name,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as current_members
      FROM teams t
      LEFT JOIN users u ON t.leader_id = u.id
      ORDER BY t.created_at DESC
    `);
    res.json({ teams });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load teams.' });
  }
});

router.put('/teams/:id', (req, res) => {
  try {
    const { name, max_size, status, leader_id } = req.body;
    run(`
      UPDATE teams
      SET name = COALESCE(?, name),
          max_size = COALESCE(?, max_size),
          status = COALESCE(?, status),
          leader_id = COALESCE(?, leader_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, max_size, status, leader_id, req.params.id]);

    res.json({ message: 'Team configuration updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update team.' });
  }
});

// ============================================================================
// MODULE J: CASE TIME SETTINGS & EXTENSIONS
// ============================================================================
router.post('/extend-time', (req, res) => {
  try {
    const { user_id, additional_minutes } = req.body;
    if (!user_id || !additional_minutes) {
      return res.status(400).json({ error: 'user_id and additional_minutes are required.' });
    }

    const session = queryOne('SELECT * FROM case_sessions WHERE user_id = ?', [user_id]);
    if (!session || !session.deadline_at) {
      return res.status(404).json({ error: 'Active case session not found for this participant.' });
    }

    const currentDeadline = new Date(session.deadline_at);
    const addedMs = parseInt(additional_minutes, 10) * 60 * 1000;
    const newDeadline = new Date(currentDeadline.getTime() + addedMs);
    const newExtension = (session.extended_minutes || 0) + parseInt(additional_minutes, 10);

    run(`
      UPDATE case_sessions
      SET deadline_at = ?,
          extended_minutes = ?,
          status = 'in_progress',
          last_active_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [newDeadline.toISOString(), newExtension, user_id]);

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'CASE_TIME_EXTENDED',
      targetObject: `USER:${user_id}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      details: { addedMinutes: additional_minutes, newDeadline: newDeadline.toISOString() }
    });

    res.json({
      message: `Extended investigation deadline by ${additional_minutes} minutes.`,
      new_deadline: newDeadline.toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to extend time.' });
  }
});

// ============================================================================
// MODULE L: FINAL REPORT TEMPLATES
// ============================================================================
router.get('/report-templates', (req, res) => {
  try {
    const templates = queryAll('SELECT * FROM report_templates ORDER BY sort_order ASC');
    res.json({ templates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load report templates.' });
  }
});

router.put('/report-templates/:id', (req, res) => {
  try {
    const { title, instructions, min_words, max_words, is_mandatory, max_score, sort_order } = req.body;
    run(`
      UPDATE report_templates
      SET title = COALESCE(?, title),
          instructions = COALESCE(?, instructions),
          min_words = COALESCE(?, min_words),
          max_words = COALESCE(?, max_words),
          is_mandatory = COALESCE(?, is_mandatory),
          max_score = COALESCE(?, max_score),
          sort_order = COALESCE(?, sort_order)
      WHERE id = ?
    `, [
      title,
      instructions,
      min_words,
      max_words,
      is_mandatory !== undefined ? (is_mandatory ? 1 : 0) : null,
      max_score,
      sort_order,
      req.params.id
    ]);

    res.json({ message: 'Report section template updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update template.' });
  }
});

// ============================================================================
// MODULE M: PARTICIPANT MANAGEMENT
// ============================================================================
router.get('/participants', (req, res) => {
  try {
    const users = queryAll(`
      SELECT u.id, u.full_name, u.email, u.college, u.department, u.year_of_study,
             u.role, u.status, u.created_at, t.name as team_name,
             cs.status as case_status, cs.started_at, cs.deadline_at, cs.extended_minutes
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN case_sessions cs ON u.id = cs.user_id
      ORDER BY u.id ASC
    `);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load participants.' });
  }
});

router.put('/participants/:id/status', (req, res) => {
  try {
    const { status, role } = req.body;
    run(`
      UPDATE users
      SET status = COALESCE(?, status),
          role = COALESCE(?, role),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, role, req.params.id]);

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'PARTICIPANT_STATUS_MODIFIED',
      targetObject: `USER:${req.params.id}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      details: { newStatus: status, newRole: role }
    });

    res.json({ message: 'User status and permissions updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update participant.' });
  }
});

// ============================================================================
// MODULE N: REPORT REVIEW & GRADING
// ============================================================================
router.get('/reports', (req, res) => {
  try {
    const reports = queryAll(`
      SELECT fr.id, fr.report_code, fr.case_id, fr.word_count, fr.status,
             fr.submitted_at, fr.updated_at,
             u.id as author_id, u.full_name as author_name, u.email as author_email,
             t.name as team_name,
             re.total_score as evaluated_score, re.reviewed_at
      FROM final_reports fr
      JOIN users u ON fr.user_id = u.id
      LEFT JOIN teams t ON fr.team_id = t.id
      LEFT JOIN report_evaluations re ON fr.id = re.report_id
      ORDER BY fr.submitted_at DESC
    `);
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load reports.' });
  }
});

router.get('/reports/:id', (req, res) => {
  try {
    const report = queryOne(`
      SELECT fr.*, u.full_name as author_name, u.email as author_email,
             u.college, u.department, t.name as team_name,
             re.total_score, re.rubric_scores_json, re.feedback, re.reviewed_at,
             evaluator.full_name as evaluator_name
      FROM final_reports fr
      JOIN users u ON fr.user_id = u.id
      LEFT JOIN teams t ON fr.team_id = t.id
      LEFT JOIN report_evaluations re ON fr.id = re.report_id
      LEFT JOIN users evaluator ON re.evaluator_id = evaluator.id
      WHERE fr.id = ?
    `, [req.params.id]);

    if (!report) return res.status(404).json({ error: 'Report not found.' });

    let parsedContent = {};
    let parsedRubric = {};
    try { parsedContent = JSON.parse(report.content_json); } catch (e) {}
    try { if (report.rubric_scores_json) parsedRubric = JSON.parse(report.rubric_scores_json); } catch (e) {}

    res.json({
      report: {
        ...report,
        content: parsedContent,
        rubric_scores: parsedRubric
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve report.' });
  }
});

// Submit evaluation and assign marks
router.post('/reports/:id/evaluate', (req, res) => {
  try {
    const { total_score, rubric_scores, feedback, status } = req.body;
    const report = queryOne('SELECT id, user_id, team_id, report_code FROM final_reports WHERE id = ?', [req.params.id]);
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    const newStatus = status || 'reviewed';
    const scoreVal = parseFloat(total_score) || 0;
    const rubricJson = JSON.stringify(rubric_scores || {});

    transaction(() => {
      // Upsert evaluation
      run(`
        INSERT INTO report_evaluations (report_id, evaluator_id, total_score, rubric_scores_json, feedback, reviewed_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(report_id) DO UPDATE SET
          evaluator_id = excluded.evaluator_id,
          total_score = excluded.total_score,
          rubric_scores_json = excluded.rubric_scores_json,
          feedback = excluded.feedback,
          reviewed_at = CURRENT_TIMESTAMP
      `, [report.id, req.user.id, scoreVal, rubricJson, feedback || '']);

      // Update report status
      run('UPDATE final_reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, report.id]);

      // If returned for revision, reopen participant session
      if (newStatus === 'returned_for_revision') {
        run("UPDATE case_sessions SET status = 'in_progress' WHERE user_id = ?", [report.user_id]);
      } else {
        // Update official leaderboard score
        run(`
          UPDATE leaderboard_scores
          SET total_score = ?,
              final_score = MAX(0, ? - penalty),
              last_updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `, [scoreVal, scoreVal, report.user_id]);
      }
    });

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'REPORT_EVALUATION_RECORDED',
      targetObject: `REPORT:${report.report_code}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      details: { score: scoreVal, status: newStatus }
    });

    res.json({ message: 'Forensic evaluation and rubric marks recorded.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record report evaluation.' });
  }
});

// ============================================================================
// MODULE O: AUDIT LOGS
// ============================================================================
router.get('/audit-logs', (req, res) => {
  try {
    const { action, outcome, limit = 100 } = req.query;
    let sql = 'SELECT * FROM audit_logs';
    const params = [];
    const conditions = [];

    if (action) {
      conditions.push('action LIKE ?');
      params.push(`%${action}%`);
    }
    if (outcome) {
      conditions.push('outcome = ?');
      params.push(outcome);
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const logs = queryAll(sql, params);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load audit logs.' });
  }
});

module.exports = router;

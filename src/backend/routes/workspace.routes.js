const express = require('express');
const router = express.Router();
const { queryAll, queryOne, run } = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const { normalizeTimeRecord } = require('../utils/time');
const { requireSectionEnabled } = require('../middleware/sectionVisibility');

// All workspace routes require participant authentication and enabled visibility
router.use(requireAuth, requireSectionEnabled('nav_workspace_visible'));


// ==========================================
// 1. INVESTIGATION NOTES
// ==========================================

// GET /api/workspace/notes
router.get('/notes', (req, res) => {
  try {
    const { category, search } = req.query;
    let sql = `
      SELECT id, note_title, content, category, pinned, created_at, updated_at
      FROM investigation_notes
      WHERE user_id = ?
    `;
    const params = [req.user.id];

    if (category && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (search) {
      sql += ' AND (note_title LIKE ? OR content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY pinned DESC, updated_at DESC';
    const notes = queryAll(sql, params);
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve notes.' });
  }
});

// POST /api/workspace/notes
router.post('/notes', (req, res) => {
  try {
    const { note_title, content, category, pinned } = req.body;
    if (!note_title || !note_title.trim()) {
      return res.status(400).json({ error: 'Note title cannot be blank.' });
    }

    const result = run(`
      INSERT INTO investigation_notes (user_id, team_id, note_title, content, category, pinned, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      req.user.id,
      req.user.team_id,
      note_title.trim(),
      content || '',
      category || 'General',
      pinned ? 1 : 0
    ]);

    const newNote = queryOne('SELECT * FROM investigation_notes WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Note saved.', note: newNote });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create note.' });
  }
});

// PUT /api/workspace/notes/:id
router.put('/notes/:id', (req, res) => {
  try {
    const note = queryOne('SELECT id FROM investigation_notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!note) {
      return res.status(404).json({ error: 'Note not found or access denied.' });
    }

    const { note_title, content, category, pinned } = req.body;
    run(`
      UPDATE investigation_notes
      SET note_title = COALESCE(?, note_title),
          content = COALESCE(?, content),
          category = COALESCE(?, category),
          pinned = COALESCE(?, pinned),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [note_title, content, category, pinned !== undefined ? (pinned ? 1 : 0) : null, req.params.id, req.user.id]);

    const updated = queryOne('SELECT * FROM investigation_notes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Note updated.', note: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update note.' });
  }
});

// DELETE /api/workspace/notes/:id
router.delete('/notes/:id', (req, res) => {
  try {
    const note = queryOne('SELECT id FROM investigation_notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!note) {
      return res.status(404).json({ error: 'Note not found or access denied.' });
    }

    run('DELETE FROM investigation_notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Note deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note.' });
  }
});

// ==========================================
// 2. TIMELINE RECONSTRUCTION
// ==========================================

// GET /api/workspace/timeline
router.get('/timeline', (req, res) => {
  try {
    const events = queryAll(`
      SELECT id, event_date, event_time, time_period, description,
             associated_suspect, associated_evidence, confidence_level, notes, created_at, updated_at
      FROM investigation_timeline
      WHERE user_id = ?
      ORDER BY event_date ASC,
               CASE WHEN time_period = 'AM' THEN 0 ELSE 1 END,
               event_time ASC
    `, [req.user.id]);

    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve timeline records.' });
  }
});

// POST /api/workspace/timeline
router.post('/timeline', (req, res) => {
  try {
    const {
      event_date,
      event_time,
      time_period,
      description,
      associated_suspect,
      associated_evidence,
      confidence_level,
      notes
    } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Event description is required.' });
    }

    // Precise AM/PM normalization without unintended clock drift
    const normalized = normalizeTimeRecord(event_date, event_time, time_period);

    const result = run(`
      INSERT INTO investigation_timeline (
        user_id, team_id, event_date, event_time, time_period,
        description, associated_suspect, associated_evidence,
        confidence_level, notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      req.user.id,
      req.user.team_id,
      normalized.event_date,
      normalized.event_time,
      normalized.time_period,
      description.trim(),
      associated_suspect || null,
      associated_evidence || null,
      confidence_level || 'High',
      notes || ''
    ]);

    const createdEvent = queryOne('SELECT * FROM investigation_timeline WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Timeline event recorded.', event: createdEvent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add timeline event.' });
  }
});

// PUT /api/workspace/timeline/:id
router.put('/timeline/:id', (req, res) => {
  try {
    const item = queryOne('SELECT id FROM investigation_timeline WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!item) {
      return res.status(404).json({ error: 'Timeline event not found or access denied.' });
    }

    const {
      event_date,
      event_time,
      time_period,
      description,
      associated_suspect,
      associated_evidence,
      confidence_level,
      notes
    } = req.body;

    const normalized = normalizeTimeRecord(event_date, event_time, time_period);

    run(`
      UPDATE investigation_timeline
      SET event_date = ?,
          event_time = ?,
          time_period = ?,
          description = COALESCE(?, description),
          associated_suspect = ?,
          associated_evidence = ?,
          confidence_level = COALESCE(?, confidence_level),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [
      normalized.event_date,
      normalized.event_time,
      normalized.time_period,
      description,
      associated_suspect || null,
      associated_evidence || null,
      confidence_level,
      notes,
      req.params.id,
      req.user.id
    ]);

    const updated = queryOne('SELECT * FROM investigation_timeline WHERE id = ?', [req.params.id]);
    res.json({ message: 'Timeline event updated.', event: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update timeline event.' });
  }
});

// DELETE /api/workspace/timeline/:id
router.delete('/timeline/:id', (req, res) => {
  try {
    const item = queryOne('SELECT id FROM investigation_timeline WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!item) {
      return res.status(404).json({ error: 'Timeline event not found or access denied.' });
    }

    run('DELETE FROM investigation_timeline WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Timeline event removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete timeline event.' });
  }
});

// ==========================================
// 3. EVIDENCE BOOKMARKS & ANNOTATIONS
// ==========================================

// GET /api/workspace/bookmarks
router.get('/bookmarks', (req, res) => {
  try {
    const bookmarks = queryAll(`
      SELECT b.id, b.evidence_id, b.personal_note, b.created_at,
             e.evidence_code, e.display_name, e.category, e.file_type, e.classification
      FROM investigation_bookmarks b
      JOIN evidence e ON b.evidence_id = e.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `, [req.user.id]);

    res.json({ bookmarks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve bookmarks.' });
  }
});

// POST /api/workspace/bookmarks (Toggle bookmark)
router.post('/bookmarks', (req, res) => {
  try {
    const { evidence_id, personal_note } = req.body;
    if (!evidence_id) {
      return res.status(400).json({ error: 'evidence_id is required.' });
    }

    const existing = queryOne('SELECT id FROM investigation_bookmarks WHERE user_id = ? AND evidence_id = ?', [req.user.id, evidence_id]);
    if (existing) {
      run('DELETE FROM investigation_bookmarks WHERE id = ?', [existing.id]);
      return res.json({ bookmarked: false, message: 'Bookmark removed.' });
    } else {
      run(`
        INSERT INTO investigation_bookmarks (user_id, evidence_id, personal_note)
        VALUES (?, ?, ?)
      `, [req.user.id, evidence_id, personal_note || '']);
      return res.status(201).json({ bookmarked: true, message: 'Evidence pinned to workspace.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bookmark.' });
  }
});

module.exports = router;

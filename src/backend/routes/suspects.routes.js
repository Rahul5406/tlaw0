const express = require('express');
const router = express.Router();
const { queryAll, queryOne } = require('../database/db');

// GET /api/suspects - List all visible suspect profiles
router.get('/', (req, res) => {
  try {
    const suspects = queryAll(`
      SELECT id, suspect_code, name, role, department, avatar_url,
             relationships, statement, whereabouts, timeline_events,
             potential_motive, supporting_evidence
      FROM suspects
      WHERE is_visible = 1
      ORDER BY id ASC
    `);
    res.json({ suspects });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve suspect dossiers.' });
  }
});

// GET /api/suspects/:id
router.get('/:id', (req, res) => {
  try {
    const suspect = queryOne(`
      SELECT id, suspect_code, name, role, department, avatar_url,
             relationships, statement, whereabouts, timeline_events,
             potential_motive, supporting_evidence
      FROM suspects
      WHERE id = ? AND is_visible = 1
    `, [req.params.id]);

    if (!suspect) {
      return res.status(404).json({ error: 'Suspect dossier not found.' });
    }

    res.json({ suspect });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve suspect profile.' });
  }
});

module.exports = router;

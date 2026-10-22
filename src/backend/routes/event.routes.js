const express = require('express');
const router = express.Router();
const { queryAll } = require('../database/db');
const { optionalAuth } = require('../middleware/auth');
const { requireSectionEnabled } = require('../middleware/sectionVisibility');

// GET /api/event/config - Public configuration
router.get('/config', (req, res) => {
  try {
    const rows = queryAll('SELECT key, value, description FROM event_config');
    const configMap = {};
    for (const row of rows) {
      configMap[row.key] = row.value;
    }
    res.json({ config: configMap });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve event configuration.' });
  }
});

// GET /api/event/rules - Active event rules and instructions
router.get('/rules', optionalAuth, requireSectionEnabled('nav_rules_visible'), (req, res) => {

  try {
    const rules = queryAll(`
      SELECT id, section_key, title, content, sort_order
      FROM event_rules
      WHERE is_active = 1
      ORDER BY sort_order ASC
    `);
    res.json({ rules });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve event rules.' });
  }
});

module.exports = router;

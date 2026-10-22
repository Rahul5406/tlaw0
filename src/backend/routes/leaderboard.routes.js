const express = require('express');
const router = express.Router();
const { queryAll, queryOne, run, transaction } = require('../database/db');
const { optionalAuth } = require('../middleware/auth');

// GET /api/leaderboard - Public/authenticated score board
router.get('/', optionalAuth, (req, res) => {
  try {
    const visConfig = queryOne("SELECT value FROM event_config WHERE key = 'leaderboard_visible'");
    const navVis = queryOne("SELECT value FROM event_config WHERE key = 'nav_leaderboard_visible'");
    const isNavVisible = navVis ? navVis.value !== 'false' && navVis.value !== '0' : true;
    const isVisible = (visConfig ? visConfig.value === 'true' : true) && isNavVisible;

    const isAdmin = req.user && req.user.role === 'admin';
    if (!isVisible && !isAdmin) {
      return res.status(403).json({
        visible: false,
        error: 'This section is currently disabled by the administrator.',
        disabled: true,
        leaderboard: []
      });
    }


    // Refresh ranks based on: final_score DESC, time_taken_seconds ASC, submitted_at ASC
    const entries = queryAll(`
      SELECT ls.id, ls.user_id, ls.team_id, ls.team_or_user_name,
             ls.total_score, ls.penalty, ls.final_score, ls.time_taken_seconds,
             ls.submitted_at, ls.reports_submitted, ls.last_updated_at,
             cs.status as investigation_status
      FROM leaderboard_scores ls
      LEFT JOIN case_sessions cs ON ls.user_id = cs.user_id
      ORDER BY ls.final_score DESC, ls.time_taken_seconds ASC, ls.submitted_at ASC
    `);

    // Assign standard competition ranks (ties receive the same rank)
    let currentRank = 1;
    let processedEntries = [];
    for (let i = 0; i < entries.length; i++) {
      if (i > 0) {
        const prev = entries[i - 1];
        const curr = entries[i];
        if (curr.final_score === prev.final_score && curr.time_taken_seconds === prev.time_taken_seconds) {
          // Tie
          processedEntries.push({ ...curr, rank: prev.rank });
          continue;
        }
      }
      processedEntries.push({ ...entries[i], rank: i + 1 });
    }

    res.json({
      visible: true,
      last_updated: new Date().toISOString(),
      tie_breaking_policy: 'Primary: Highest Final Score -> Secondary: Least Elapsed Time -> Tertiary: Earliest Submission Timestamp',
      leaderboard: processedEntries
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve scoreboard.' });
  }
});

module.exports = router;

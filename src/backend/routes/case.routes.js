const express = require('express');
const router = express.Router();
const { queryOne, queryAll, run } = require('../database/db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { calculateRemainingSeconds, getServerIsoString } = require('../utils/time');
const { logAuditEvent } = require('../middleware/audit');
const { requireSectionEnabled } = require('../middleware/sectionVisibility');


// GET /api/case/session
router.get('/session', requireAuth, (req, res) => {
  try {
    let session = queryOne(`
      SELECT cs.*, t.name as team_name
      FROM case_sessions cs
      LEFT JOIN teams t ON cs.team_id = t.id
      WHERE cs.user_id = ?
    `, [req.user.id]);

    if (!session) {
      // Auto-create session if missing
      run(`
        INSERT INTO case_sessions (user_id, team_id, case_id, status, rules_acknowledged)
        VALUES (?, ?, 'TLA-026', 'not_started', 0)
      `, [req.user.id, req.user.team_id]);
      session = queryOne('SELECT * FROM case_sessions WHERE user_id = ?', [req.user.id]);
    }

    // Config parameters
    const graceConfig = queryOne("SELECT value FROM event_config WHERE key = 'grace_period_minutes'");
    const graceMinutes = graceConfig ? parseInt(graceConfig.value, 10) : 5;

    // Remaining seconds (Authoritative Server Time)
    let remainingSeconds = null;
    if (session.started_at && session.deadline_at) {
      remainingSeconds = calculateRemainingSeconds(session.deadline_at, graceMinutes);
      // If timer ran out and status was still in_progress, mark expired
      if (remainingSeconds <= 0 && session.status === 'in_progress') {
        run("UPDATE case_sessions SET status = 'expired' WHERE id = ?", [session.id]);
        session.status = 'expired';
      }
    }

    // Progress metrics
    const evidenceCount = queryOne("SELECT COUNT(*) as c FROM evidence WHERE is_available = 1 AND archived = 0").c;
    const notesCount = queryOne("SELECT COUNT(*) as c FROM investigation_notes WHERE user_id = ?", [req.user.id]).c;
    const timelineCount = queryOne("SELECT COUNT(*) as c FROM investigation_timeline WHERE user_id = ?", [req.user.id]).c;
    const reportDraft = queryOne("SELECT last_saved_at FROM report_drafts WHERE user_id = ?", [req.user.id]);
    const finalReport = queryOne("SELECT id, report_code, status, submitted_at, word_count FROM final_reports WHERE user_id = ?", [req.user.id]);
    const myScore = queryOne("SELECT final_score, rank FROM leaderboard_scores WHERE user_id = ?", [req.user.id]);

    res.json({
      session: {
        ...session,
        remaining_seconds: remainingSeconds,
        server_time: getServerIsoString()
      },
      metrics: {
        evidence_available: evidenceCount,
        notes_count: notesCount,
        timeline_count: timelineCount,
        has_draft: !!reportDraft,
        draft_saved_at: reportDraft ? reportDraft.last_saved_at : null,
        final_report: finalReport || null,
        score: myScore ? myScore.final_score : null,
        rank: myScore ? myScore.rank : null
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve case session state.' });
  }
});

// POST /api/case/acknowledge-rules
router.post('/acknowledge-rules', requireAuth, (req, res) => {
  try {
    run(`
      UPDATE case_sessions
      SET rules_acknowledged = 1, last_active_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [req.user.id]);

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'RULES_ACKNOWLEDGED',
      targetObject: `USER:${req.user.id}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip
    });

    res.json({ message: 'Event rules acknowledged.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record rules acknowledgement.' });
  }
});

// POST /api/case/start
router.post('/start', requireAuth, (req, res) => {
  try {
    const session = queryOne('SELECT * FROM case_sessions WHERE user_id = ?', [req.user.id]);
    if (!session) {
      return res.status(404).json({ error: 'Case session not initialized.' });
    }

    // CRITICAL REQUIREMENT: A browser refresh or repeated button click MUST NEVER reset an existing timer!
    if (session.status === 'in_progress' && session.started_at && session.deadline_at) {
      const remainingSeconds = calculateRemainingSeconds(session.deadline_at, 5);
      return res.json({
        message: 'Investigation is already in progress.',
        already_started: true,
        session: {
          ...session,
          remaining_seconds: remainingSeconds,
          server_time: getServerIsoString()
        }
      });
    }

    if (session.status === 'submitted') {
      return res.status(400).json({ error: 'Investigation has already been submitted for evaluation.' });
    }

    // Check if rules acknowledgement is required
    const ackReqConfig = queryOne("SELECT value FROM event_config WHERE key = 'require_rules_ack'");
    const requireAck = ackReqConfig ? ackReqConfig.value === 'true' : true;
    if (requireAck && !session.rules_acknowledged) {
      return res.status(400).json({
        error: 'You must acknowledge the Event Rules and Instructions before commencing the investigation.'
      });
    }

    // Check opening and closing window
    const openConfig = queryOne("SELECT value FROM event_config WHERE key = 'opening_time'");
    const closeConfig = queryOne("SELECT value FROM event_config WHERE key = 'closing_time'");
    const now = Date.now();

    if (openConfig && openConfig.value) {
      const openTime = new Date(openConfig.value).getTime();
      if (now < openTime) {
        return res.status(403).json({ error: `Investigation case has not opened yet. Opens at: ${openConfig.value}` });
      }
    }
    if (closeConfig && closeConfig.value) {
      const closeTime = new Date(closeConfig.value).getTime();
      if (now > closeTime) {
        return res.status(403).json({ error: `Investigation window closed on ${closeConfig.value}.` });
      }
    }

    // Duration in minutes
    const durConfig = queryOne("SELECT value FROM event_config WHERE key = 'default_duration_minutes'");
    const durationMinutes = durConfig ? parseInt(durConfig.value, 10) : 180;

    const startedAt = new Date();
    const deadlineAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

    run(`
      UPDATE case_sessions
      SET status = 'in_progress',
          started_at = ?,
          deadline_at = ?,
          last_active_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [startedAt.toISOString(), deadlineAt.toISOString(), req.user.id]);

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'CASE_STARTED',
      targetObject: `CASE:TLA-026`,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      details: { startedAt: startedAt.toISOString(), deadlineAt: deadlineAt.toISOString() }
    });

    const updatedSession = queryOne('SELECT * FROM case_sessions WHERE user_id = ?', [req.user.id]);
    const remainingSeconds = calculateRemainingSeconds(updatedSession.deadline_at, 5);

    return res.json({
      message: 'Case TLA-026 investigation commenced. Server timer activated.',
      session: {
        ...updatedSession,
        remaining_seconds: remainingSeconds,
        server_time: getServerIsoString()
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start case investigation.' });
  }
});

// GET /api/case/story - Case narrative sections
router.get('/story', optionalAuth, requireSectionEnabled('nav_story_visible'), (req, res) => {

  try {
    const sections = queryAll(`
      SELECT id, section_id, title, subtitle, content, badge, classification, sort_order
      FROM case_story_sections
      WHERE is_published = 1
      ORDER BY sort_order ASC
    `);

    const attachments = queryAll(`
      SELECT csa.id, csa.story_id, csa.evidence_id, csa.original_filename,
             csa.file_type, csa.mime_type, csa.file_size, csa.sha256_hash, ev.evidence_code
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
    res.status(500).json({ error: 'Failed to retrieve case narrative story.' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { queryAll, queryOne, run, transaction } = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const { calculateRemainingSeconds, getServerIsoString } = require('../utils/time');
const { logAuditEvent } = require('../middleware/audit');
const { requireSectionEnabled } = require('../middleware/sectionVisibility');

// All report routes require authentication and enabled visibility
router.use(requireAuth, requireSectionEnabled('nav_report_visible'));


// Helper to count words
function countWords(str) {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

// GET /api/report/template
router.get('/template', (req, res) => {
  try {
    const sections = queryAll(`
      SELECT id, section_key, section_number, title, instructions,
             min_words, max_words, is_mandatory, max_score, sort_order
      FROM report_templates
      ORDER BY sort_order ASC
    `);
    res.json({ sections });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve report template.' });
  }
});

// GET /api/report/draft
router.get('/draft', (req, res) => {
  try {
    const draft = queryOne('SELECT content_json, last_saved_at FROM report_drafts WHERE user_id = ?', [req.user.id]);
    if (!draft) {
      return res.json({ draft: null, last_saved_at: null });
    }
    let parsed = {};
    try {
      parsed = JSON.parse(draft.content_json);
    } catch (e) {
      parsed = {};
    }
    res.json({ draft: parsed, last_saved_at: draft.last_saved_at });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve draft.' });
  }
});

// PUT /api/report/draft - Autosave draft
router.put('/draft', (req, res) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'object') {
      return res.status(400).json({ error: 'Invalid draft format.' });
    }

    const jsonString = JSON.stringify(content);
    run(`
      INSERT INTO report_drafts (user_id, team_id, content_json, last_saved_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        content_json = excluded.content_json,
        last_saved_at = CURRENT_TIMESTAMP
    `, [req.user.id, req.user.team_id, jsonString]);

    res.json({ message: 'Draft autosaved.', saved_at: getServerIsoString() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to autosave draft.' });
  }
});

// POST /api/report/submit - Final Report Submission
router.post('/submit', (req, res) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'object') {
      return res.status(400).json({ error: 'Submission content is missing or malformed.' });
    }

    // 1. Check existing submission
    const existing = queryOne('SELECT id, status, report_code FROM final_reports WHERE user_id = ?', [req.user.id]);
    if (existing && existing.status !== 'returned_for_revision') {
      return res.status(400).json({
        error: `A final report (${existing.report_code}) has already been submitted. Resubmission is not permitted unless unlocked by an administrator.`
      });
    }

    // 2. Check session and server deadline
    const session = queryOne('SELECT * FROM case_sessions WHERE user_id = ?', [req.user.id]);
    if (!session || session.status === 'not_started') {
      return res.status(400).json({ error: 'You have not initiated the case investigation yet.' });
    }

    const graceConfig = queryOne("SELECT value FROM event_config WHERE key = 'grace_period_minutes'");
    const graceMinutes = graceConfig ? parseInt(graceConfig.value, 10) : 5;
    const remainingSeconds = session.deadline_at ? calculateRemainingSeconds(session.deadline_at, graceMinutes) : 999999;

    let submissionStatus = 'submitted';
    if (remainingSeconds <= 0) {
      const latePolicyConfig = queryOne("SELECT value FROM event_config WHERE key = 'late_submission_policy'");
      const latePolicy = latePolicyConfig ? latePolicyConfig.value : 'allow_with_penalty';
      if (latePolicy === 'disallow') {
        return res.status(403).json({ error: 'The investigation window has expired. Submissions are closed.' });
      }
      submissionStatus = 'late';
    }

    // 3. Validate template sections
    const templates = queryAll('SELECT * FROM report_templates ORDER BY sort_order ASC');
    let totalWordCount = 0;
    const errors = [];

    for (const tpl of templates) {
      const sectionData = content[tpl.section_key] || '';
      const words = countWords(sectionData);
      totalWordCount += words;

      if (tpl.is_mandatory && (!sectionData || words === 0)) {
        errors.push(`Section "${tpl.title}" is mandatory and cannot be left blank.`);
      } else if (tpl.min_words > 0 && words < tpl.min_words) {
        errors.push(`Section "${tpl.title}" requires at least ${tpl.min_words} words (currently ${words} words).`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Report validation failed. Please address the following issues:',
        details: errors
      });
    }

    // 4. Save Final Report
    const reportCode = `REP-TLA-026-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const jsonString = JSON.stringify(content);

    transaction(() => {
      run(`
        INSERT INTO final_reports (
          report_code, user_id, team_id, case_id, content_json,
          word_count, status, submitted_at, updated_at
        ) VALUES (?, ?, ?, 'TLA-026', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(report_code) DO NOTHING
      `, [reportCode, req.user.id, req.user.team_id, jsonString, totalWordCount, submissionStatus]);

      run(`
        UPDATE case_sessions
        SET status = 'submitted', last_active_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [req.user.id]);

      // Calculate initial baseline score
      const baseScore = submissionStatus === 'late' ? 70.0 : 80.0;
      const penalty = submissionStatus === 'late' ? 10.0 : 0.0;
      const finalScore = baseScore - penalty;

      const userProfile = queryOne(`
        SELECT u.full_name, t.name as team_name
        FROM users u
        LEFT JOIN teams t ON u.team_id = t.id
        WHERE u.id = ?
      `, [req.user.id]);

      const displayName = userProfile.team_name ? `${userProfile.team_name} (${userProfile.full_name})` : userProfile.full_name;

      run(`
        INSERT INTO leaderboard_scores (
          user_id, team_id, team_or_user_name, total_score, penalty,
          final_score, time_taken_seconds, submitted_at, reports_submitted, last_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 7200, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
          final_score = excluded.final_score,
          submitted_at = CURRENT_TIMESTAMP,
          reports_submitted = 1,
          last_updated_at = CURRENT_TIMESTAMP
      `, [req.user.id, req.user.team_id, displayName, baseScore, penalty, finalScore]);
    });

    logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'FINAL_REPORT_SUBMISSION',
      targetObject: `REPORT:${reportCode}`,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      details: { wordCount: totalWordCount, status: submissionStatus }
    });

    res.status(201).json({
      message: 'Official forensic report submitted successfully.',
      report_code: reportCode,
      status: submissionStatus,
      submitted_at: getServerIsoString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process report submission.' });
  }
});

// GET /api/report/my-submission
router.get('/my-submission', (req, res) => {
  try {
    const report = queryOne(`
      SELECT fr.id, fr.report_code, fr.case_id, fr.content_json, fr.word_count,
             fr.status, fr.submitted_at, fr.updated_at,
             re.total_score as evaluated_score, re.rubric_scores_json, re.feedback, re.reviewed_at
      FROM final_reports fr
      LEFT JOIN report_evaluations re ON fr.id = re.report_id
      WHERE fr.user_id = ?
    `, [req.user.id]);

    if (!report) {
      return res.json({ submission: null });
    }

    let parsedContent = {};
    let parsedRubrics = {};
    try {
      parsedContent = JSON.parse(report.content_json);
    } catch (e) {}
    try {
      if (report.rubric_scores_json) {
        parsedRubrics = JSON.parse(report.rubric_scores_json);
      }
    } catch (e) {}

    res.json({
      submission: {
        ...report,
        content: parsedContent,
        rubric_scores: parsedRubrics
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve submission.' });
  }
});

module.exports = router;

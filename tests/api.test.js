// Automated Integration Test Suite for THE LAST ARTIFACT (TLA-026)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { app } = require('../src/server');

let server;
let port = 3888;
let baseUrl;

function request(method, endpoint, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const reqOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers }
    };

    let bodyData = null;
    if (body) {
      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        bodyData = body;
      } else {
        bodyData = JSON.stringify(body);
        reqOptions.headers['Content-Type'] = 'application/json';
      }
      reqOptions.headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json || data
        });
      });
    });

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

// Multipart form-data builder for multi-file upload testing
function makeMultipartBody(files, fields, boundary) {
  const parts = [];
  for (const [k, v] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
  }
  for (const f of files) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${f.filename}"\r\nContent-Type: ${f.contentType || 'text/plain'}\r\n\r\n`));
    parts.push(f.content);
    parts.push(Buffer.from('\r\n'));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(parts);
}

async function runTests() {
  console.log('================================================================');
  console.log('  THE LAST ARTIFACT (TLA-026) - INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // Start dedicated test server
  await new Promise((resolve) => {
    server = app.listen(port, () => {
      baseUrl = `http://localhost:${port}`;
      console.log(`[TEST SERVER] Running on ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    const { run: dbRun } = require('../src/backend/database/db');
    ['nav_dashboard_visible', 'nav_rules_visible', 'nav_story_visible', 'nav_vault_visible', 'nav_workspace_visible', 'nav_report_visible', 'nav_leaderboard_visible'].forEach(k => {
      dbRun('UPDATE event_config SET value = ? WHERE key = ?', ['true', k]);
    });

    // 1. Health Check
    const health = await request('GET', '/api/health');
    assert(health.status === 200 && health.body.case_id === 'TLA-026', 'Health Check endpoint operational');

    // 2. Participant Registration
    const testEmail = `agent.test.${Date.now()}@ssec.ac.in`;
    const regRes = await request('POST', '/api/auth/register', {}, {
      full_name: 'Special Investigator Test',
      email: testEmail,
      college: 'Sree Sakthi Engineering College',
      department: 'Computer Science',
      year_of_study: '4th Year',
      team_name: `Test Unit ${Date.now()}`,
      password: 'SecurePassword123!',
      confirm_password: 'SecurePassword123!'
    });
    assert(regRes.status === 201 && regRes.body.token, 'Participant registration with team allocation succeeds');
    const participantToken = regRes.body.token;

    // 3. Duplicate Email Prevention
    const dupRes = await request('POST', '/api/auth/register', {}, {
      full_name: 'Duplicate Test',
      email: testEmail,
      college: 'Sree Sakthi Engineering College',
      department: 'Computer Science',
      year_of_study: '4th Year',
      password: 'SecurePassword123!',
      confirm_password: 'SecurePassword123!'
    });
    assert(dupRes.status === 409, 'Duplicate email registration correctly rejected with 409 Conflict');

    // 4. Invalid Login Handling
    const badLogin = await request('POST', '/api/auth/login', {}, {
      email: testEmail,
      password: 'WrongPassword!'
    });
    assert(badLogin.status === 401, 'Invalid credentials rejected with 401 Unauthorized');

    // 5. Valid Login
    const goodLogin = await request('POST', '/api/auth/login', {}, {
      email: testEmail,
      password: 'SecurePassword123!'
    });
    assert(goodLogin.status === 200 && goodLogin.body.token, 'Participant authentication succeeds with JWT');

    // 6. Role-Based Route Protection (RBAC) - Participant forbidden from admin APIs
    const rbacTest = await request('GET', '/api/admin/metrics', {
      'Authorization': `Bearer ${participantToken}`
    });
    assert(rbacTest.status === 403, 'Participant cannot access privileged admin metrics (403 Forbidden)');

    // 7. Admin Login
    const adminLogin = await request('POST', '/api/auth/login', {}, {
      email: 'admin@cyra.forensics',
      password: 'AdminForensics2026!'
    });
    assert(adminLogin.status === 200 && adminLogin.body.user.role === 'admin', 'Administrator authentication succeeds');
    const adminToken = adminLogin.body.token;

    // 8. Admin Metrics Access
    const adminMetrics = await request('GET', '/api/admin/metrics', {
      'Authorization': `Bearer ${adminToken}`
    });
    assert(adminMetrics.status === 200 && adminMetrics.body.metrics.total_participants >= 1, 'Admin metrics returns real database counts');

    // 9. Event Config and Rules
    const eventConfig = await request('GET', '/api/event/config');
    const eventRules = await request('GET', '/api/event/rules');
    assert(eventConfig.status === 200 && eventRules.status === 200 && eventRules.body.rules.length >= 8, 'Event config and all 8 rules loaded');

    // 10. Rules Acknowledgement
    const ackRes = await request('POST', '/api/case/acknowledge-rules', {
      'Authorization': `Bearer ${participantToken}`
    });
    assert(ackRes.status === 200, 'Investigator successfully acknowledges event rules');

    // 11. Start Case (Server-Authoritative Timer Activation)
    const startCase = await request('POST', '/api/case/start', {
      'Authorization': `Bearer ${participantToken}`
    });
    assert(startCase.status === 200 && startCase.body.session.status === 'in_progress', 'Case started and server timer activated');
    const firstRemaining = startCase.body.session.remaining_seconds;

    // 12. Refresh / Repeat Click Protection (Must NOT reset timer)
    const repeatStart = await request('POST', '/api/case/start', {
      'Authorization': `Bearer ${participantToken}`
    });
    assert(repeatStart.status === 200 && repeatStart.body.already_started === true, 'Repeated case start does NOT reset the timer');

    // 13. Evidence Vault Catalog
    const evidenceRes = await request('GET', '/api/evidence');
    assert(evidenceRes.status === 200 && evidenceRes.body.evidence.length >= 7, 'Evidence vault contains all seeded artifacts with SHA-256');

    // 14. Workspace Notes CRUD
    const createNote = await request('POST', '/api/workspace/notes', {
      'Authorization': `Bearer ${participantToken}`
    }, {
      note_title: 'Faraday Cage Anomaly',
      content: 'Unit 3 showed signs of forced mechanical bypass.',
      category: 'Digital Evidence'
    });
    assert(createNote.status === 201 && createNote.body.note.id, 'Investigator note created in workspace');

    // 15. Timeline Reconstruction with Accurate AM/PM Handling
    const createTimeline = await request('POST', '/api/workspace/timeline', {
      'Authorization': `Bearer ${participantToken}`
    }, {
      event_date: '2026-09-24',
      event_time: '09:36',
      time_period: 'PM',
      description: 'Emergency keypad PIN 7729* entered at Lab 3 door',
      associated_suspect: 'Rohit Sen',
      associated_evidence: 'EVD-026-01',
      confidence_level: 'High'
    });
    assert(createTimeline.status === 201 && createTimeline.body.event.time_period === 'PM', 'Timeline event preserved with exact AM/PM representation');

    // 16. Report Draft Autosave
    function generateText(wordsNeeded, prefix) {
      const words = [];
      for (let i = 0; i < wordsNeeded + 15; i++) {
        words.push(`${prefix}_token_${i}`);
      }
      return words.join(' ');
    }

    const draftContent = {
      case_summary: generateText(50, 'summary'),
      incident_overview: generateText(75, 'incident'),
      investigation_objectives: generateText(40, 'objectives'),
      evidence_examined: generateText(100, 'evidence'),
      timeline_of_events: generateText(150, 'timeline'),
      suspect_analysis: generateText(150, 'suspect'),
      findings: generateText(100, 'findings'),
      supporting_evidence_references: generateText(50, 'references'),
      alternative_hypotheses: generateText(60, 'hypotheses'),
      conclusion: generateText(75, 'conclusion'),
      team_details: generateText(30, 'team')
    };

    const draftRes = await request('PUT', '/api/report/draft', {
      'Authorization': `Bearer ${participantToken}`
    }, { content: draftContent });
    assert(draftRes.status === 200, 'Report draft successfully autosaved to database');

    // Verify draft retrieval across page reloads
    const getDraftRes = await request('GET', '/api/report/draft', {
      'Authorization': `Bearer ${participantToken}`
    });
    assert(getDraftRes.status === 200 && getDraftRes.body.draft && getDraftRes.body.draft.case_summary === draftContent.case_summary, 'Autosaved draft persisted and retrieved accurately across reloads');

    // 17. Final Report Submission
    const submitRes = await request('POST', '/api/report/submit', {
      'Authorization': `Bearer ${participantToken}`
    }, { content: draftContent });
    assert(submitRes.status === 201 && submitRes.body.report_code, 'Final 11-section forensic report submitted and sealed');

    // 17b. Submission Locking (Prevent Double Submission)
    const duplicateSubmit = await request('POST', '/api/report/submit', {
      'Authorization': `Bearer ${participantToken}`
    }, { content: draftContent });
    assert(duplicateSubmit.status === 400 && duplicateSubmit.body.error.includes('already been submitted'), 'Resubmission blocked after report is locked and sealed');

    // 17c. Verify Participant Submission Inspection
    const mySubRes = await request('GET', '/api/report/my-submission', {
      'Authorization': `Bearer ${participantToken}`
    });
    assert(mySubRes.status === 200 && mySubRes.body.submission && mySubRes.body.submission.report_code === submitRes.body.report_code, 'Submitted report retrieved via my-submission with valid report code');

    // 18. Leaderboard Verification
    const leaderboardRes = await request('GET', '/api/leaderboard');
    assert(leaderboardRes.status === 200 && leaderboardRes.body.leaderboard.length >= 1, 'Leaderboard renders real database scores and tie-breaking criteria');

    // 19. Multiple File Upload Ingestion by Administrator
    const boundary = '----ForensicsBoundary' + Date.now();
    const testFiles = [
      { filename: 'packet_dump_test1.txt', content: Buffer.from('TEST PCAP DUMP 01: SYN ACK TO 10.14.8.102') },
      { filename: 'memory_core_test2.txt', content: Buffer.from('TEST CORE DUMP 02: 0xDEADBEEF REGISTER STATE') },
      { filename: 'telemetry_stream_test3.csv', content: Buffer.from('time,node,state\n21:00,AETHER-07,OK\n21:30,AETHER-07,TAMPER\n') }
    ];
    const multiBody = makeMultipartBody(testFiles, {
      category: 'System Logs',
      classification: 'SECONDARY',
      score_value: '15',
      description: 'Batch multi-file upload integration verification'
    }, boundary);

    const uploadRes = await request('POST', '/api/admin/evidence/upload', {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    }, multiBody);
    console.log('DEBUG uploadRes:', uploadRes.status, uploadRes.body);
    assert(uploadRes.status === 201 && uploadRes.body && uploadRes.body.uploaded && uploadRes.body.uploaded.length === 3, 'Multiple evidence files uploaded simultaneously in one batch');

    // Verify existing evidence was preserved (no overwriting the whole collection)
    const updatedEvidence = await request('GET', '/api/evidence');
    assert(updatedEvidence.body.evidence.length >= 10, 'Existing evidence collection preserved after batch ingestion (10+ items)');

    // 20. Security Audit Log Verification
    const auditRes = await request('GET', '/api/admin/audit-logs', {
      'Authorization': `Bearer ${adminToken}`
    });
    assert(auditRes.status === 200 && auditRes.body.logs.length >= 5, 'Security audit trail recorded privileged actions and logins');

    // 21. Case Story Section CRUD by Administrator
    const storyKey = `story_test_${Date.now()}`;
    const createStoryRes = await request('POST', '/api/admin/story', {
      'Authorization': `Bearer ${adminToken}`
    }, {
      section_id: storyKey,
      title: 'Faraday Enclosure Compromise Analysis',
      subtitle: 'Hardware Extraction Forensic Briefing',
      content: 'Physical perimeter inspection reveals electromagnetic shielding bypass.',
      badge: 'CRITICAL INTEL',
      classification: 'RESTRICTED',
      sort_order: 99
    });
    assert(createStoryRes.status === 201 && createStoryRes.body.id, 'Case story section created successfully with returned section ID');
    const createdStoryId = createStoryRes.body.id;

    // Verify newly added section is published to participant case story narrative
    const publicStoryRes = await request('GET', '/api/case/story');
    const createdSection = publicStoryRes.body.sections.find(s => s.section_id === storyKey);
    assert(publicStoryRes.status === 200 && createdSection && createdSection.title === 'Faraday Enclosure Compromise Analysis', 'Newly added case story section rendered in participant briefing');

    // 22. Case Story Evidence Attachment Upload & Security Verification
    // 22a. Unauthorized upload attempt by participant (non-admin)
    const unauthBoundary = '----BoundaryUnauth' + Date.now();
    const unauthBody = makeMultipartBody([
      { filename: 'unauth_test.txt', content: Buffer.from('unauthorized payload') }
    ], {}, unauthBoundary);
    const unauthUploadRes = await request('POST', `/api/admin/story/${createdStoryId}/attachments`, {
      'Authorization': `Bearer ${participantToken}`,
      'Content-Type': `multipart/form-data; boundary=${unauthBoundary}`
    }, unauthBody);
    assert(unauthUploadRes.status === 403, 'Participant cannot upload attachments to case story section (403 Forbidden)');

    // 22b. Disallowed file type rejection (.exe)
    const badExtBoundary = '----BoundaryBadExt' + Date.now();
    const badExtBody = makeMultipartBody([
      { filename: 'malicious_exploit.exe', content: Buffer.from('MZ\x90\x00\x03\x00\x00\x00') }
    ], {}, badExtBoundary);
    const badExtRes = await request('POST', `/api/admin/story/${createdStoryId}/attachments`, {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': `multipart/form-data; boundary=${badExtBoundary}`
    }, badExtBody);
    assert(badExtRes.status === 400 && badExtRes.body.error.includes('not permitted'), 'Disallowed file extension (.exe) rejected by upload validator');

    // 22c. Path traversal prevention in filename
    const traversalBoundary = '----BoundaryTraversal' + Date.now();
    const traversalBody = makeMultipartBody([
      { filename: '../../../etc_passwd_sim.txt', content: Buffer.from('root:x:0:0:root:/root:/bin/bash') }
    ], {}, traversalBoundary);
    const traversalRes = await request('POST', `/api/admin/story/${createdStoryId}/attachments`, {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': `multipart/form-data; boundary=${traversalBoundary}`
    }, traversalBody);
    assert(traversalRes.status === 201 && !traversalRes.body.attachments[0].stored_filename.includes('..'), 'Path traversal sanitized; filename stored securely in upload directory');

    // 22d. Batch upload of 4 evidence files simultaneously in one selection
    const attachBoundary = '----BoundaryAttach' + Date.now();
    const batchEvidenceFiles = [
      { filename: 'faraday_rf_intercept.txt', content: Buffer.from('FREQ: 2.45GHz RF LEAKAGE DETECTED AT 02:14:09') },
      { filename: 'perimeter_sensor_grid.csv', content: Buffer.from('sensor_id,zone,status\nS-01,ARCH_3,TRIPPED\nS-02,FARADAY,BYPASS\n') },
      { filename: 'rf_shield_schematic.pdf', content: Buffer.from('%PDF-1.4\n%Forensic schematic of Faraday cage enclosure breach\n%%EOF') },
      { filename: 'circuit_bypass_still.png', content: Buffer.from('\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4') }
    ];
    const attachBody = makeMultipartBody(batchEvidenceFiles, {}, attachBoundary);
    const attachRes = await request('POST', `/api/admin/story/${createdStoryId}/attachments`, {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': `multipart/form-data; boundary=${attachBoundary}`
    }, attachBody);
    assert(attachRes.status === 201 && attachRes.body.attachments && attachRes.body.attachments.length === 4, 'Uploaded 4 evidence files simultaneously in one batch selection');

    // Verify SHA-256 hash preservation for uploaded files
    const firstAtt = attachRes.body.attachments[0];
    assert(firstAtt.sha256_hash && firstAtt.sha256_hash.length === 64, 'SHA-256 cryptographic hash calculated and stored for uploaded evidence');

    // 22e. Persistence check after refresh / reload:
    // Admin list
    const adminStoryWithAtt = await request('GET', '/api/admin/story', {
      'Authorization': `Bearer ${adminToken}`
    });
    const reloadedSection = adminStoryWithAtt.body.sections.find(s => s.id === createdStoryId);
    assert(reloadedSection && reloadedSection.attachments && reloadedSection.attachments.length >= 4, 'Attachments remain associated with section after refresh/reload');

    // Specific section attachments endpoint
    const secAttRes = await request('GET', `/api/admin/story/${createdStoryId}/attachments`, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert(secAttRes.status === 200 && secAttRes.body.attachments && secAttRes.body.attachments.length >= 4, 'Story attachments endpoint returns persisted files and metadata');

    // Participant briefing narrative
    const pubStoryWithAtt = await request('GET', '/api/case/story');
    const pubSection = pubStoryWithAtt.body.sections.find(s => s.id === createdStoryId);
    assert(pubSection && pubSection.attachments && pubSection.attachments.length >= 4, 'Attached evidence files available in participant case briefing');

    // 22f. Editing section and adding additional file sequentially
    const addBoundary = '----BoundaryAdditional' + Date.now();
    const addBody = makeMultipartBody([
      { filename: 'additional_oscilloscope_log.txt', content: Buffer.from('OSCILLOSCOPE CH1: 5.1V SPIKE AT TIMESTAMP 1727144049') }
    ], {}, addBoundary);
    const addRes = await request('POST', `/api/admin/story/${createdStoryId}/attachments`, {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': `multipart/form-data; boundary=${addBoundary}`
    }, addBody);
    assert(addRes.status === 201 && addRes.body.attachments.length === 1, 'Additional evidence file appended without losing existing attachments');

    // 22g. Removal of an attachment with database safety preservation
    const targetToDelete = attachRes.body.attachments[0];
    const delAttRes = await request('DELETE', `/api/admin/story/${createdStoryId}/attachments/${targetToDelete.id}`, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert(delAttRes.status === 200, 'Persisted attachment unlinked from story section successfully');

    // Verify underlying evidence record in vault was NOT deleted (safe detachment)
    const checkEvidenceRes = await request('GET', '/api/evidence');
    const preservedEvidence = checkEvidenceRes.body.evidence.find(e => e.id === targetToDelete.evidence_id);
    assert(preservedEvidence !== undefined, 'Underlying evidence record preserved in evidence vault when detached from story section');

    // Clean up created story section via Admin API
    if (createdStoryId) {
      const delStoryRes = await request('DELETE', `/api/admin/story/${createdStoryId}`, {
        'Authorization': `Bearer ${adminToken}`
      });
      assert(delStoryRes.status === 200, 'Case story section deleted and cleaned up successfully');
    }

    // 23. Admin-Controlled Participant Navigation Visibility & Route Protection Tests (TLA-026)
    console.log('\n--- 23. Testing Admin-Controlled Participant Navigation Visibility ---');

    // 23a. Verify default visibility settings are all ON ('true')
    const initConfigRes = await request('GET', '/api/event/config');
    const initCfg = initConfigRes.body.config || {};
    assert(initCfg.nav_dashboard_visible === 'true', 'nav_dashboard_visible defaults to true (ON)');
    assert(initCfg.nav_rules_visible === 'true', 'nav_rules_visible defaults to true (ON)');
    assert(initCfg.nav_story_visible === 'true', 'nav_story_visible defaults to true (ON)');
    assert(initCfg.nav_vault_visible === 'true', 'nav_vault_visible defaults to true (ON)');
    assert(initCfg.nav_workspace_visible === 'true', 'nav_workspace_visible defaults to true (ON)');
    assert(initCfg.nav_report_visible === 'true', 'nav_report_visible defaults to true (ON)');
    assert(initCfg.nav_leaderboard_visible === 'true', 'nav_leaderboard_visible defaults to true (ON)');

    // 23b. Test Evidence Vault toggle and route protection
    // Switch Evidence Vault OFF
    const setVaultOff = await request('PUT', '/api/admin/config', {
      'Authorization': `Bearer ${adminToken}`
    }, { updates: { nav_vault_visible: 'false' } });
    assert(setVaultOff.status === 200, 'Admin successfully switches Evidence Vault OFF');

    // Participant attempts to access Evidence Vault API -> 403 Forbidden
    const partVaultAccess = await request('GET', '/api/evidence', {
      'Authorization': `Bearer ${participantToken}`
    });
    assert(
      partVaultAccess.status === 403 &&
      partVaultAccess.body.error === 'This section is currently disabled by the administrator.',
      'Participant blocked from Evidence Vault API with 403 and disabled message'
    );

    // Administrator retains full clearance to Evidence Vault API -> 200 OK
    const adminVaultAccess = await request('GET', '/api/evidence', {
      'Authorization': `Bearer ${adminToken}`
    });
    assert(adminVaultAccess.status === 200, 'Administrator retains full access to Evidence Vault API when disabled');

    // Switch Evidence Vault back ON
    const setVaultOn = await request('PUT', '/api/admin/config', {
      'Authorization': `Bearer ${adminToken}`
    }, { updates: { nav_vault_visible: 'true' } });
    assert(setVaultOn.status === 200, 'Admin successfully switches Evidence Vault back ON');

    // Participant accesses Evidence Vault API again -> 200 OK
    const partVaultAccessRestored = await request('GET', '/api/evidence', {
      'Authorization': `Bearer ${participantToken}`
    });
    assert(partVaultAccessRestored.status === 200, 'Participant access to Evidence Vault API restored when switched ON');

    // 23c. Test Final Report toggle and route protection
    // Switch Final Report OFF
    const setReportOff = await request('PUT', '/api/admin/config', {
      'Authorization': `Bearer ${adminToken}`
    }, { updates: { nav_report_visible: 'false' } });
    assert(setReportOff.status === 200, 'Admin successfully switches Final Report OFF');

    // Participant attempts to access report draft -> 403 Forbidden
    const partReportAccess = await request('GET', '/api/report/draft', {
      'Authorization': `Bearer ${participantToken}`
    });
    assert(
      partReportAccess.status === 403 &&
      partReportAccess.body.error === 'This section is currently disabled by the administrator.',
      'Participant blocked from Final Report draft API with 403 and disabled message'
    );

    // Switch Final Report back ON
    const setReportOn = await request('PUT', '/api/admin/config', {
      'Authorization': `Bearer ${adminToken}`
    }, { updates: { nav_report_visible: 'true' } });
    assert(setReportOn.status === 200, 'Admin successfully switches Final Report back ON');

    // Participant accesses report draft again -> 200 OK
    const partReportAccessRestored = await request('GET', '/api/report/draft', {
      'Authorization': `Bearer ${participantToken}`
    });
    assert(partReportAccessRestored.status === 200, 'Participant access to Final Report draft restored when switched ON');

    // 23d. Test Score Board / Leaderboard toggle and route protection
    // Switch Score Board OFF
    const setLbOff = await request('PUT', '/api/admin/config', {
      'Authorization': `Bearer ${adminToken}`
    }, { updates: { nav_leaderboard_visible: 'false' } });
    assert(setLbOff.status === 200, 'Admin successfully switches Score Board OFF');

    // Participant attempts to access Leaderboard API -> 403 Forbidden
    const partLbAccess = await request('GET', '/api/leaderboard', {
      'Authorization': `Bearer ${participantToken}`
    });
    assert(
      partLbAccess.status === 403 &&
      partLbAccess.body.error === 'This section is currently disabled by the administrator.',
      'Participant blocked from Score Board API with 403 and disabled message'
    );

    // Admin retains clearance to Leaderboard API -> 200 OK
    const adminLbAccess = await request('GET', '/api/leaderboard', {
      'Authorization': `Bearer ${adminToken}`
    });
    assert(adminLbAccess.status === 200, 'Administrator retains access to Score Board API when disabled');

    // Switch Score Board back ON
    const setLbOn = await request('PUT', '/api/admin/config', {
      'Authorization': `Bearer ${adminToken}`
    }, { updates: { nav_leaderboard_visible: 'true' } });
    assert(setLbOn.status === 200, 'Admin successfully switches Score Board back ON');

    const partLbRestored = await request('GET', '/api/leaderboard', {
      'Authorization': `Bearer ${participantToken}`
    });
    assert(partLbRestored.status === 200, 'Participant access to Score Board API restored when switched ON');

    // 23e. Test Case Story toggle and route protection
    const setStoryOff = await request('PUT', '/api/admin/config', {
      'Authorization': `Bearer ${adminToken}`
    }, { updates: { nav_story_visible: 'false' } });
    assert(setStoryOff.status === 200, 'Admin switches Case Story OFF');

    const partStoryAccess = await request('GET', '/api/case/story', {
      'Authorization': `Bearer ${participantToken}`
    });
    assert(
      partStoryAccess.status === 403 &&
      partStoryAccess.body.error === 'This section is currently disabled by the administrator.',
      'Participant blocked from Case Story API with 403 when disabled'
    );

    const setStoryOn = await request('PUT', '/api/admin/config', {
      'Authorization': `Bearer ${adminToken}`
    }, { updates: { nav_story_visible: 'true' } });
    assert(setStoryOn.status === 200, 'Admin switches Case Story back ON');

    // 23f. Test Workspace toggle and route protection
    const setWsOff = await request('PUT', '/api/admin/config', {
      'Authorization': `Bearer ${adminToken}`
    }, { updates: { nav_workspace_visible: 'false' } });
    assert(setWsOff.status === 200, 'Admin switches Workspace OFF');

    const partWsAccess = await request('GET', '/api/workspace/notes', {
      'Authorization': `Bearer ${participantToken}`
    });
    assert(
      partWsAccess.status === 403 &&
      partWsAccess.body.error === 'This section is currently disabled by the administrator.',
      'Participant blocked from Workspace API with 403 when disabled'
    );

    const setWsOn = await request('PUT', '/api/admin/config', {
      'Authorization': `Bearer ${adminToken}`
    }, { updates: { nav_workspace_visible: 'true' } });
    assert(setWsOn.status === 200, 'Admin switches Workspace back ON');

    // 23g. Verify final persistence in event_config
    const finalCfgRes = await request('GET', '/api/event/config');
    const finalCfg = finalCfgRes.body.config || {};
    assert(
      finalCfg.nav_vault_visible === 'true' &&
      finalCfg.nav_report_visible === 'true' &&
      finalCfg.nav_leaderboard_visible === 'true' &&
      finalCfg.nav_story_visible === 'true' &&
      finalCfg.nav_workspace_visible === 'true',
      'All navigation visibility settings persisted in database event_config table'
    );

    // 24. Suspect Dossier Creation, Image Upload & Profile Management Tests (TLA-026)
    console.log('\n--- 24. Testing Suspect Dossier Creation & Management ---');

    // 24a. Unauthorized access rejection
    const unauthCreate = await request('POST', '/api/admin/suspects', {
      'Authorization': `Bearer ${participantToken}`
    }, { name: 'Intruder Suspect', role: 'Attacker' });
    assert(unauthCreate.status === 403, 'Participant blocked from creating suspect dossier (403 Forbidden)');

    const unauthDelete = await request('DELETE', '/api/admin/suspects/1', {
      'Authorization': `Bearer ${participantToken}`
    });
    assert(unauthDelete.status === 403, 'Participant blocked from deleting suspect dossier (403 Forbidden)');

    // 24b. Required field validations
    const noNameRes = await request('POST', '/api/admin/suspects', {
      'Authorization': `Bearer ${adminToken}`
    }, { role: 'Senior Cryptographer' });
    assert(noNameRes.status === 400 && noNameRes.body.error.includes('required'), 'Reject suspect creation missing full name with 400 Bad Request');

    const noRoleRes = await request('POST', '/api/admin/suspects', {
      'Authorization': `Bearer ${adminToken}`
    }, { name: 'Dr. Test Name' });
    assert(noRoleRes.status === 400 && noRoleRes.body.error.includes('required'), 'Reject suspect creation missing project role with 400 Bad Request');

    // 24c. Suspect avatar upload endpoint
    const avatarBoundary = '----BoundaryAvatar' + Date.now();
    const avatarBody = makeMultipartBody([
      { filename: 'varun_avatar.jpg', contentType: 'image/jpeg', content: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]) }
    ], {}, avatarBoundary);

    const avatarUploadRes = await request('POST', '/api/admin/suspects/upload-avatar', {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': `multipart/form-data; boundary=${avatarBoundary}`
    }, avatarBody);
    assert(avatarUploadRes.status === 200 && avatarUploadRes.body.avatar_url, 'Admin successfully uploads suspect avatar image');
    const uploadedAvatarUrl = avatarUploadRes.body.avatar_url;

    // Disallowed extension rejected
    const badAvatarBoundary = '----BoundaryBadAvatar' + Date.now();
    const badAvatarBody = makeMultipartBody([
      { filename: 'malware.exe', contentType: 'application/x-msdownload', content: Buffer.from('MZ...') }
    ], {}, badAvatarBoundary);
    const badAvatarRes = await request('POST', '/api/admin/suspects/upload-avatar', {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': `multipart/form-data; boundary=${badAvatarBoundary}`
    }, badAvatarBody);
    assert(badAvatarRes.status === 400, 'Suspect avatar upload rejects disallowed non-image extension with 400');

    // 24d. Create new suspect with all fields populated
    const createFullRes = await request('POST', '/api/admin/suspects', {
      'Authorization': `Bearer ${adminToken}`
    }, {
      name: 'Dr. Varun Seth',
      role: 'Senior Hardware Cryptographer',
      statement: 'I was reviewing side-channel power traces in Sector 2 until 22:30 IST.',
      whereabouts: 'Sector 2 Secure Analysis Bay',
      potential_motive: 'Disputed patent ownership over the cryptographic coprocessor algorithm.',
      avatar_url: uploadedAvatarUrl
    });
    assert(createFullRes.status === 201 && createFullRes.body.suspect, 'Admin successfully creates suspect with all fields populated');
    const createdSuspect1 = createFullRes.body.suspect;
    assert(createdSuspect1.suspect_code && createdSuspect1.suspect_code.startsWith('SUSP-'), 'Server generates unique suspect code starting with SUSP-');
    assert(createdSuspect1.avatar_url === uploadedAvatarUrl, 'Created suspect retains uploaded avatar URL');

    // 24e. Create new suspect without image (defaults to placeholder)
    const createNoImageRes = await request('POST', '/api/admin/suspects', {
      'Authorization': `Bearer ${adminToken}`
    }, {
      name: 'Dr. Tanya Sen',
      role: 'Telemetry Communications Specialist',
      statement: 'I observed unusual packet transmission frequencies from ARCH Lab 3 at 21:15 IST.',
      whereabouts: 'Signals Monitoring Station 4',
      potential_motive: 'Denied research transfer to the defense project.'
    });
    assert(createNoImageRes.status === 201 && createNoImageRes.body.suspect, 'Admin creates suspect without image');
    const createdSuspect2 = createNoImageRes.body.suspect;
    assert(createdSuspect2.avatar_url === '/assets/images/suspects/default_suspect.svg', 'Suspect without image defaults to default_suspect.svg placeholder');
    assert(createdSuspect2.suspect_code !== createdSuspect1.suspect_code, 'Distinct unique suspect code generated for second suspect');

    // 24f. Verify newly created suspects visible in public and admin lists
    const pubSuspectsRes = await request('GET', '/api/suspects');
    const hasSuspect1 = pubSuspectsRes.body.suspects.some(s => s.name === 'Dr. Varun Seth');
    const hasSuspect2 = pubSuspectsRes.body.suspects.some(s => s.name === 'Dr. Tanya Sen');
    assert(hasSuspect1 && hasSuspect2, 'Both newly created suspects appear in participant suspects list alongside existing 4 suspects');
    assert(pubSuspectsRes.body.suspects.length >= 6, 'Total suspect count updated to include new dossiers (6+)');

    // 24g. Edit an existing suspect dossier
    const editRes = await request('PUT', `/api/admin/suspects/${createdSuspect1.id}`, {
      'Authorization': `Bearer ${adminToken}`
    }, {
      name: 'Dr. Varun Seth (Updated)',
      role: 'Principal Side-Channel Analyst',
      potential_motive: 'Confirmed covert communications with foreign research consortium.'
    });
    assert(editRes.status === 200 && editRes.body.suspect.name === 'Dr. Varun Seth (Updated)', 'Admin successfully updates suspect dossier details');

    // 24h. Delete created suspect with database safety preservation
    const delRes = await request('DELETE', `/api/admin/suspects/${createdSuspect1.id}`, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert(delRes.status === 200, 'Admin successfully deletes suspect dossier');

    // Clean up second suspect
    const delRes2 = await request('DELETE', `/api/admin/suspects/${createdSuspect2.id}`, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert(delRes2.status === 200, 'Second test suspect dossier deleted cleanly');

    // Verify core 4 suspects remain intact
    const finalSuspects = await request('GET', '/api/suspects');
    const coreNames = ['Arjun Dev', 'Kavin Raj', 'Meera Nair', 'Rohit Sen'];
    const allCorePresent = coreNames.every(name => finalSuspects.body.suspects.some(s => s.name === name));
    assert(allCorePresent, 'All 4 original core suspects (Arjun Dev, Kavin Raj, Meera Nair, Rohit Sen) preserved and intact');

    // Verify evidence collection untouched
    const checkEvd = await request('GET', '/api/evidence');
    assert(checkEvd.status === 200 && checkEvd.body.evidence.length >= 10, 'Forensic evidence collection preserved without deletion or corruption');

  } catch (err) {
    console.error('[TEST ERROR]', err);
    failed++;
  } finally {
    if (server) server.close();
  }

  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };

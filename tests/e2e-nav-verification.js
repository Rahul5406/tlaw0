// End-to-End Verification Script for Participant Navigation Visibility (TLA-026)
const http = require('http');

const PORT = 3000;
const BASE = `http://localhost:${PORT}`;

function request(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const reqOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers }
    };

    let bodyData = null;
    if (body) {
      bodyData = JSON.stringify(body);
      reqOptions.headers['Content-Type'] = 'application/json';
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

async function verify() {
  console.log('================================================================');
  console.log('  TLA-026 PARTICIPANT NAVIGATION VISIBILITY END-TO-END VERIFICATION');
  console.log('================================================================\n');

  // 1. Authenticate Admin
  const adminLogin = await request('POST', '/api/auth/login', {}, {
    email: 'admin@cyra.forensics',
    password: 'AdminForensics2026!'
  });
  if (adminLogin.status !== 200 || !adminLogin.body.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.body));
  }
  const adminToken = adminLogin.body.token;
  console.log('✓ Step 1: Admin authenticated successfully');

  // 2. Register/Login Participant
  const participantEmail = `investigator.nav.${Date.now()}@ssec.ac.in`;
  const regRes = await request('POST', '/api/auth/register', {}, {
    full_name: 'Navigation Test Investigator',
    email: participantEmail,
    college: 'Sree Sakthi Engineering College',
    department: 'Cyber Forensics',
    year_of_study: '3rd Year',
    team_name: `Nav Squad ${Date.now()}`,
    password: 'SecurePassword123!',
    confirm_password: 'SecurePassword123!'
  });
  const participantToken = regRes.body.token;
  console.log('✓ Step 2: Participant authenticated successfully');

  // 3. Verify Default Visibility: All 7 items are ON
  const initConfig = await request('GET', '/api/event/config');
  const cfg = initConfig.body.config;
  const items = [
    'nav_dashboard_visible',
    'nav_rules_visible',
    'nav_story_visible',
    'nav_vault_visible',
    'nav_workspace_visible',
    'nav_report_visible',
    'nav_leaderboard_visible'
  ];
  for (const item of items) {
    if (cfg[item] !== 'true') throw new Error(`Default setting for ${item} is not 'true'! Got: ${cfg[item]}`);
  }
  console.log('✓ Step 3: Default visibility verified: All 7 items are ON (true)');

  // 4. Test Evidence Vault OFF
  console.log('\n--- Testing Evidence Vault OFF ---');
  await request('PUT', '/api/admin/config', { 'Authorization': `Bearer ${adminToken}` }, {
    updates: { nav_vault_visible: 'false' }
  });
  const vaultPartRes = await request('GET', '/api/evidence', { 'Authorization': `Bearer ${participantToken}` });
  if (vaultPartRes.status !== 403 || !vaultPartRes.body.error.includes('disabled by the administrator')) {
    throw new Error('Participant access to Evidence Vault was not blocked with 403! Got: ' + vaultPartRes.status);
  }
  console.log('✓ Participant blocked from Evidence Vault API (403 Forbidden with disabled message)');

  const vaultAdminRes = await request('GET', '/api/evidence', { 'Authorization': `Bearer ${adminToken}` });
  if (vaultAdminRes.status !== 200) {
    throw new Error('Admin was blocked from Evidence Vault! Got: ' + vaultAdminRes.status);
  }
  console.log('✓ Admin retains full clearance to Evidence Vault API (200 OK)');

  // Re-enable Evidence Vault
  await request('PUT', '/api/admin/config', { 'Authorization': `Bearer ${adminToken}` }, {
    updates: { nav_vault_visible: 'true' }
  });
  const vaultPartRestored = await request('GET', '/api/evidence', { 'Authorization': `Bearer ${participantToken}` });
  if (vaultPartRestored.status !== 200) {
    throw new Error('Participant access to Evidence Vault was not restored! Got: ' + vaultPartRestored.status);
  }
  console.log('✓ Evidence Vault restored to ON: Participant access working again (200 OK)');

  // 5. Test Final Report OFF
  console.log('\n--- Testing Final Report OFF ---');
  await request('PUT', '/api/admin/config', { 'Authorization': `Bearer ${adminToken}` }, {
    updates: { nav_report_visible: 'false' }
  });
  const reportPartRes = await request('GET', '/api/report/draft', { 'Authorization': `Bearer ${participantToken}` });
  if (reportPartRes.status !== 403 || !reportPartRes.body.error.includes('disabled by the administrator')) {
    throw new Error('Participant access to Final Report was not blocked with 403! Got: ' + reportPartRes.status);
  }
  console.log('✓ Participant blocked from Final Report API (403 Forbidden with disabled message)');

  // Re-enable Final Report
  await request('PUT', '/api/admin/config', { 'Authorization': `Bearer ${adminToken}` }, {
    updates: { nav_report_visible: 'true' }
  });
  const reportPartRestored = await request('GET', '/api/report/draft', { 'Authorization': `Bearer ${participantToken}` });
  if (reportPartRestored.status !== 200) {
    throw new Error('Participant access to Final Report was not restored! Got: ' + reportPartRestored.status);
  }
  console.log('✓ Final Report restored to ON: Participant access working again (200 OK)');

  // 6. Test Score Board OFF
  console.log('\n--- Testing Score Board OFF ---');
  await request('PUT', '/api/admin/config', { 'Authorization': `Bearer ${adminToken}` }, {
    updates: { nav_leaderboard_visible: 'false' }
  });
  const lbPartRes = await request('GET', '/api/leaderboard', { 'Authorization': `Bearer ${participantToken}` });
  if (lbPartRes.status !== 403 || !lbPartRes.body.error.includes('disabled by the administrator')) {
    throw new Error('Participant access to Score Board was not blocked with 403! Got: ' + lbPartRes.status);
  }
  console.log('✓ Participant blocked from Score Board API (403 Forbidden with disabled message)');

  const lbAdminRes = await request('GET', '/api/leaderboard', { 'Authorization': `Bearer ${adminToken}` });
  if (lbAdminRes.status !== 200) {
    throw new Error('Admin was blocked from Score Board! Got: ' + lbAdminRes.status);
  }
  console.log('✓ Admin retains access to Score Board API (200 OK)');

  // Re-enable Score Board
  await request('PUT', '/api/admin/config', { 'Authorization': `Bearer ${adminToken}` }, {
    updates: { nav_leaderboard_visible: 'true' }
  });
  const lbPartRestored = await request('GET', '/api/leaderboard', { 'Authorization': `Bearer ${participantToken}` });
  if (lbPartRestored.status !== 200) {
    throw new Error('Participant access to Score Board was not restored! Got: ' + lbPartRestored.status);
  }
  console.log('✓ Score Board restored to ON: Participant access working again (200 OK)');

  // 7. Verify Persistence in Database
  console.log('\n--- Verifying Database Persistence ---');
  const finalCheck = await request('GET', '/api/event/config');
  for (const item of items) {
    if (finalCheck.body.config[item] !== 'true') {
      throw new Error(`Item ${item} did not persist as 'true' in event_config!`);
    }
  }
  console.log('✓ All 7 navigation visibility settings verified persistent in SQLite event_config table');

  console.log('\n================================================================');
  console.log('  ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
  console.log('================================================================');
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

// End-to-End Verification for Add New Suspect Dossier (TLA-026)
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

function makeMultipartBody(files, fields, boundary) {
  const parts = [];
  for (const [k, v] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
  }
  for (const f of files) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="avatar"; filename="${f.filename}"\r\nContent-Type: ${f.contentType || 'image/jpeg'}\r\n\r\n`));
    parts.push(f.content);
    parts.push(Buffer.from('\r\n'));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(parts);
}

async function verify() {
  console.log('================================================================');
  console.log('  TLA-026 ADD NEW SUSPECT DOSSIER END-TO-END VERIFICATION');
  console.log('================================================================\n');

  // 1. Admin Login
  const adminLogin = await request('POST', '/api/auth/login', {}, {
    email: 'admin@cyra.forensics',
    password: 'AdminForensics2026!'
  });
  if (adminLogin.status !== 200 || !adminLogin.body.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.body));
  }
  const adminToken = adminLogin.body.token;
  console.log('✓ Step 1: Admin authenticated successfully');

  // 2. Participant Login / Role Security Check
  const participantEmail = `investigator.suspect.${Date.now()}@ssec.ac.in`;
  const regRes = await request('POST', '/api/auth/register', {}, {
    full_name: 'Investigator Check',
    email: participantEmail,
    college: 'Sree Sakthi Engineering College',
    department: 'Cyber Forensics',
    year_of_study: '3rd Year',
    team_name: `Suspect Team ${Date.now()}`,
    password: 'SecurePassword123!',
    confirm_password: 'SecurePassword123!'
  });
  const participantToken = regRes.body.token;

  const forbiddenCreate = await request('POST', '/api/admin/suspects', {
    'Authorization': `Bearer ${participantToken}`
  }, { name: 'Illegal Suspect', role: 'Intruder' });
  if (forbiddenCreate.status !== 403) {
    throw new Error('Participant was not rejected with 403! Got: ' + forbiddenCreate.status);
  }
  console.log('✓ Step 2: Role-based authorization verified (non-admin blocked with 403 Forbidden)');

  // 3. Validation: Missing Required Fields
  const badReq1 = await request('POST', '/api/admin/suspects', {
    'Authorization': `Bearer ${adminToken}`
  }, { role: 'Only Role' });
  if (badReq1.status !== 400) throw new Error('Missing name did not return 400! Got: ' + badReq1.status);

  const badReq2 = await request('POST', '/api/admin/suspects', {
    'Authorization': `Bearer ${adminToken}`
  }, { name: 'Only Name' });
  if (badReq2.status !== 400) throw new Error('Missing role did not return 400! Got: ' + badReq2.status);
  console.log('✓ Step 3: Required fields validation verified on server (Full Name and Project Role required)');

  // 4. Upload Profile Image
  const bnd = '----BoundaryTest' + Date.now();
  const body = makeMultipartBody([
    { filename: 'dr_varun_avatar.jpg', contentType: 'image/jpeg', content: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]) }
  ], {}, bnd);
  const uploadRes = await request('POST', '/api/admin/suspects/upload-avatar', {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': `multipart/form-data; boundary=${bnd}`
  }, body);
  if (uploadRes.status !== 200 || !uploadRes.body.avatar_url) {
    throw new Error('Avatar upload failed: ' + JSON.stringify(uploadRes.body));
  }
  const uploadedUrl = uploadRes.body.avatar_url;
  console.log('✓ Step 4: Suspect profile image uploaded successfully:', uploadedUrl);

  // 5. Create New Suspect With All Fields Populated
  const create1 = await request('POST', '/api/admin/suspects', {
    'Authorization': `Bearer ${adminToken}`
  }, {
    name: 'Dr. Varun Seth',
    role: 'Lead Cryptographic Hardware Auditor',
    statement: 'I completed my validation sweep in the Faraday chamber at 21:30 IST and returned to the Sector 2 clean room.',
    whereabouts: 'Sector 2 Clean Room, ARCH Facility',
    potential_motive: 'Disputed patent co-authorship for the hardware acceleration core.',
    avatar_url: uploadedUrl
  });
  if (create1.status !== 201 || !create1.body.suspect) {
    throw new Error('Suspect creation failed: ' + JSON.stringify(create1.body));
  }
  const suspect1 = create1.body.suspect;
  console.log(`✓ Step 5: New suspect created with all fields: ${suspect1.name} (Code: ${suspect1.suspect_code})`);

  // 6. Create Suspect Without Image (Default Placeholder)
  const create2 = await request('POST', '/api/admin/suspects', {
    'Authorization': `Bearer ${adminToken}`
  }, {
    name: 'Dr. Tanya Sen',
    role: 'RF Spectrum & Communications Analyst',
    statement: 'I detected high-frequency burst anomalies near ARCH Lab 3 at 22:15 IST.',
    whereabouts: 'Roof-level Antenna Platform',
    potential_motive: 'Denied research clearance to deploy external monitoring nodes.'
  });
  if (create2.status !== 201 || !create2.body.suspect) {
    throw new Error('Suspect without image creation failed: ' + JSON.stringify(create2.body));
  }
  const suspect2 = create2.body.suspect;
  if (!suspect2.avatar_url.includes('default_suspect.svg')) {
    throw new Error('Suspect without image did not default to default_suspect.svg! Got: ' + suspect2.avatar_url);
  }
  console.log(`✓ Step 6: Suspect without image created with default placeholder: ${suspect2.name} (${suspect2.avatar_url})`);

  // 7. Verify Persistence & Coexistence With Existing 4 Suspects
  const allSuspects = await request('GET', '/api/suspects');
  const names = allSuspects.body.suspects.map(s => s.name);
  const coreExpected = ['Arjun Dev', 'Kavin Raj', 'Meera Nair', 'Rohit Sen'];
  for (const c of coreExpected) {
    if (!names.includes(c)) throw new Error(`Core suspect ${c} missing!`);
  }
  if (!names.includes('Dr. Varun Seth') || !names.includes('Dr. Tanya Sen')) {
    throw new Error('Newly created suspects missing from database query!');
  }
  console.log('✓ Step 7: Persistence verified. All 4 original suspects + 2 newly created suspects present in database (Total:', allSuspects.body.suspects.length, ')');

  // 8. Edit Existing Suspect
  const editRes = await request('PUT', `/api/admin/suspects/${suspect1.id}`, {
    'Authorization': `Bearer ${adminToken}`
  }, {
    name: 'Dr. Varun Seth (Senior Auditor)',
    role: 'Chief Cryptographic Hardware Auditor',
    statement: 'Updated official statement regarding timeline discrepancies at ARCH Lab 3.'
  });
  if (editRes.status !== 200 || editRes.body.suspect.name !== 'Dr. Varun Seth (Senior Auditor)') {
    throw new Error('Suspect edit failed: ' + JSON.stringify(editRes.body));
  }
  console.log('✓ Step 8: Suspect editing verified and updated in database');

  // 9. Clean up created test suspects
  await request('DELETE', `/api/admin/suspects/${suspect1.id}`, { 'Authorization': `Bearer ${adminToken}` });
  await request('DELETE', `/api/admin/suspects/${suspect2.id}`, { 'Authorization': `Bearer ${adminToken}` });

  // 10. Verify Core Suspects and Evidence are completely preserved
  const finalCheck = await request('GET', '/api/suspects');
  if (finalCheck.body.suspects.length !== 4) {
    throw new Error('Core suspect count after cleanup is not 4! Got: ' + finalCheck.body.suspects.length);
  }
  const evdCheck = await request('GET', '/api/evidence');
  if (evdCheck.status !== 200 || evdCheck.body.evidence.length < 10) {
    throw new Error('Evidence collection damaged! Got: ' + evdCheck.status);
  }
  console.log('✓ Step 9 & 10: Clean removal verified. Core 4 suspects and 10+ evidence records preserved intact');

  console.log('\n================================================================');
  console.log('  ALL SUSPECT DOSSIER VERIFICATION TESTS PASSED!');
  console.log('================================================================');
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

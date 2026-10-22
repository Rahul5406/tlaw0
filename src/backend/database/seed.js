const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { run, queryOne, exec, transaction } = require('./db');
const { runMigrations } = require('./migrations');
const { calculateFileSha256 } = require('../utils/hasher');
const config = require('../config');

async function seedDatabase() {
  console.log('[SEED] Starting database initialization and seeding...');

  // 1. Ensure migrations are up to date
  runMigrations();

  // Hash passwords
  const adminPasswordHash = await bcrypt.hash('AdminForensics2026!', 10);
  const userPasswordHash = await bcrypt.hash('Investigator2026!', 10);

  transaction(() => {
    // 2. Default Team
    run(`
      INSERT OR IGNORE INTO teams (id, name, max_size, status)
      VALUES (1, 'CipherTrack Alpha', 4, 'active')
    `);

    // 3. Admin Account
    run(`
      INSERT OR REPLACE INTO users (id, full_name, email, password_hash, college, department, year_of_study, role, status)
      VALUES (1, 'Chief Inspector / Admin', 'admin@cyra.forensics', ?, 'Sree Sakthi Engineering College', 'Cyber Forensics Division', 'Faculty Administrator', 'admin', 'active')
    `, [adminPasswordHash]);

    // 4. Default Participant
    run(`
      INSERT OR REPLACE INTO users (id, full_name, email, password_hash, college, department, year_of_study, role, team_id, status)
      VALUES (2, 'Agent Dhruv Saxena', 'investigator@cyra.forensics', ?, 'Sree Sakthi Engineering College', 'Computer Science & Engineering', '4th Year', 'participant', 1, 'active')
    `, [userPasswordHash]);

    // Update team leader
    run(`UPDATE teams SET leader_id = 2 WHERE id = 1`);
    run(`
      INSERT OR REPLACE INTO team_members (id, team_id, user_id, role_in_team)
      VALUES (1, 1, 2, 'leader')
    `);

    // 5. Default Case Session for participant
    run(`
      INSERT OR IGNORE INTO case_sessions (user_id, team_id, case_id, status, rules_acknowledged)
      VALUES (2, 1, 'TLA-026', 'not_started', 0)
    `);

    // 6. Global Event Config
    const configs = [
      ['site_title', 'THE LAST ARTIFACT', 'Official title of forensic event'],
      ['case_id', 'TLA-026', 'Active case identifier'],
      ['project_name', 'PROJECT AETHER', 'Covert research project code'],
      ['institution', 'CyRA Community @ Sree Sakthi Engineering College', 'Organizing community and college'],
      ['default_duration_minutes', '180', 'Allocated investigation time in minutes (3 hours)'],
      ['warning_threshold_minutes', '15', 'Timer warning threshold before expiry'],
      ['grace_period_minutes', '5', 'Grace period after deadline for final transmission'],
      ['opening_time', '2026-09-24T00:00:00.000Z', 'Case investigation release window start'],
      ['closing_time', '2026-12-31T23:59:59.000Z', 'Final event deadline'],
      ['submission_deadline', '2026-12-31T23:59:59.000Z', 'Server submission cutoff timestamp'],
      ['late_submission_policy', 'allow_with_penalty', 'Policy for late submissions: allow_with_penalty or disallow'],
      ['require_rules_ack', 'true', 'Require participant to acknowledge rules before timer starts'],
      ['scoring_enabled', 'true', 'Enable score computation and rubric grading'],
      ['leaderboard_visible', 'true', 'Leaderboard visibility toggle for participants'],
      ['theme_accent', 'forensic_green', 'Primary theme accent: forensic_green or dark_emerald or cyber_teal'],
      ['banner_image_url', '/assets/images/tla_case_banner.jpg', 'Hero command center banner image'],
      ['homepage_hero_title', 'THE LAST ARTIFACT (TLA-026)', 'Homepage headline'],
      ['homepage_hero_subtitle', 'Digital Forensics Investigation & Intellectual Property Theft', 'Homepage sub-headline'],
      ['homepage_intro_text', 'At 22:45 IST on 24 September 2026, Dr. Alok Mathur was discovered unresponsive in ARCH Research Lab 3. Simultaneously, the core cryptographic hardware prototype for PROJECT AETHER disappeared from the high-security Faraday enclosure. As an authorized forensic analyst, your objective is to reconstruct the crime timeline, inspect physical and digital evidence, interrogate suspect testimonies, and uncover the truth behind The Last Artifact.', 'Main incident narrative on homepage'],
      ['footer_text', 'Organized by CyRA Community, Sree Sakthi Engineering College. For official investigative simulation only.', 'Footer disclaimer'],
      ['contact_email', 'cyra.forensics@sreesakthi.ac.in', 'Support contact address'],
      ['outro_title', 'INVESTIGATION CONCLUDED', 'Post-submission headline'],
      ['outro_message', 'Your official forensic investigative report for Case TLA-026 has been sealed with a cryptographic timestamp and transferred to the CyRA Examination Board.', 'Post-submission message'],
      ['outro_next_steps', 'Evaluation of your timeline precision, evidence correlation, and suspect attribution is underway. Final marks and forensic accolades will appear on the official Score Board upon evaluation completion.', 'Post-submission next steps instructions']
    ];

    for (const [key, value, desc] of configs) {
      run(`
        INSERT OR REPLACE INTO event_config (key, value, description)
        VALUES (?, ?, ?)
      `, [key, value, desc]);
    }

    // 7. Event Rules & Instructions
    const rules = [
      [
        'overview',
        'Event Overview & Objectives',
        `The Last Artifact (TLA-026) is a high-fidelity digital forensics simulation designed by the CyRA Community at Sree Sakthi Engineering College.\n\nParticipants step into the role of senior digital forensics investigators assigned to solve the suspicious death of Dr. Alok Mathur and the theft of the PROJECT AETHER hardware prototype.\n\nYour primary objectives are:\n1. Reconstruct an exact chronological timeline of events on the night of 24 September 2026.\n2. Correlate digital access logs, network captures, hex memory dumps, and physical surveillance.\n3. Dissect the statements of the four key suspects and identify alibi discrepancies.\n4. Produce an authoritative forensic report following the standard 11-section protocol.`,
        1
      ],
      [
        'guidelines',
        'Case Investigation Guidelines',
        `• Maintain digital chain of custody. Do not alter or tamper with raw evidence timestamps.\n• Cross-reference physical ingress records with network packet dumps.\n• Pay close attention to cryptographic signatures and unauthorized firmware watermarks.\n• Record all hypotheses and timeline discoveries in your dedicated Investigation Workspace.\n• Ensure every finding is anchored to verified evidence codes (e.g. EVD-026-01, EVD-026-02).`,
        2
      ],
      [
        'tools',
        'Permitted Analysis Tools & Environments',
        `Investigators are permitted to utilize:\n• CyberChef and base64/hex decoding utilities.\n• Wireshark, Tshark, or spreadsheet software for CSV network capture inspection.\n• Hex editors (HxD, ImHex, GHex) for firmware analysis.\n• Standard forensic text editors, PDF readers, and audio analysis tools.\n• Native platform viewers embedded in the Evidence Vault.`,
        3
      ],
      [
        'time_limits',
        'Time Limits & Countdown Policy',
        `• Each team is allocated an authoritative 180-minute (3-hour) investigation window upon clicking "Start Case".\n• The session timer is synchronized with the CyRA backend server clock. Browser reloads, tab switches, and client-side clock alterations WILL NOT pause or reset the timer.\n• A warning banner will display when 15 minutes remain.\n• A 5-minute grace period is provided strictly for report submission transmission.`,
        4
      ],
      [
        'scoring',
        'Scoring Rubric & Penalties',
        `Evaluation is based on a 100-point forensic scale:\n• Timeline Precision & Completeness: 20 Points\n• Evidence Correlation & Chain of Custody: 20 Points\n• Suspect Analysis & Alibi Refutation: 20 Points\n• Correct Identification of Culprit & Modus Operandi: 25 Points\n• Report Professionalism, Clarity & Structure: 15 Points\n\nPenalties:\n• Late submissions incur a 10-point deduction per 15 minutes past the grace period.\n• Unsubstantiated speculation lacking evidence citations will incur rubric penalties.`,
        5
      ],
      [
        'team_rules',
        'Team Structure & Workspace Isolation',
        `• Teams consist of 1 to 4 registered investigators.\n• One investigator acts as Team Leader and possesses report submission authority.\n• All investigators within a team share the synchronized team investigation notes and timeline.\n• Investigators outside your team CANNOT view your draft findings or private notes.`,
        6
      ],
      [
        'report_requirements',
        'Final Report Standards',
        `The submission must strictly follow the official 11-section forensic report template:\n1. Case Summary\n2. Incident Overview\n3. Investigation Objectives\n4. Evidence Examined\n5. Timeline of Events\n6. Suspect Analysis\n7. Findings\n8. Supporting Evidence & References\n9. Alternative Hypotheses\n10. Conclusion\n11. Investigator / Team Details\n\nDrafts are automatically saved in the database every 30 seconds.`,
        7
      ],
      [
        'academic_integrity',
        'Academic Integrity & Anti-Collusion',
        `• Inter-team collaboration, credential sharing, and unauthorized disclosure of evidence files are strictly prohibited.\n• All submitted text is processed through forensic authorship verification.\n• Any team caught sharing clues or attempting to compromise server endpoints will be immediately disqualified and logged in the CyRA Security Audit Registry.`,
        8
      ]
    ];

    for (const [key, title, content, sortOrder] of rules) {
      run(`
        INSERT OR REPLACE INTO event_rules (section_key, title, content, sort_order, is_active)
        VALUES (?, ?, ?, ?, 1)
      `, [key, title, content, sortOrder]);
    }

    // 8. Case Story Sections
    const storySections = [
      [
        'story_incident',
        'Incident Overview: The Night of 24 September 2026',
        'Official Cyber-Crime Division Case Briefing',
        `At 22:45 IST on Thursday, 24 September 2026, the night security officer at the Advanced Research & Computing Hub (ARCH) facility conducted a routine patrol of Sector 3. Upon reaching ARCH Lab 3, the officer discovered Dr. Alok Mathur, Principal Investigator for PROJECT AETHER, collapsed beside his primary workstation.\n\nEmergency medical personnel arrived at 22:58 IST and pronounced Dr. Mathur deceased at the scene. Preliminary examination indicated sudden respiratory failure. Crucially, the custom Faraday enclosure unit (Unit 3), which housed the working hardware revision of the AETHER-Node-07 cryptographic sensor, was found unlocked, energized, and empty.\n\nThe local law enforcement division declared the incident a high-priority cyber-espionage and suspicious death investigation. CyRA Forensic Analysts have been deployed to secure all electronic logs, surveillance streams, and lab assets.`,
        'HIGH PRIORITY',
        'RESTRICTED',
        1
      ],
      [
        'story_victim',
        'Victim Profile: Dr. Alok Mathur',
        'Principal Investigator & Lead Cryptographer',
        `Dr. Alok Mathur (54) was a distinguished professor and chief architect of PROJECT AETHER, an indigenous defense-grade distributed cryptographic mesh network.\n\nAccording to lab personnel, Dr. Mathur had grown increasingly paranoid over the past three weeks. In an encrypted memo sent to the Dean on 21 September, he wrote:\n"Certain telemetry packets emitted by our test nodes are being mirrored to an external command-and-control server. Someone within the ARCH core team has compromised the bootloader keys. I intend to confront the individual on Thursday night once the hardware trace completes."\n\nDr. Mathur was known to keep the master recovery key on a physical hardware dongle, which was missing from his person.`,
        'PERSONNEL FILE',
        'CONFIDENTIAL',
        2
      ],
      [
        'story_project',
        'PROJECT AETHER: Technical Specification',
        'Next-Generation Secure Sensor Mesh Architecture',
        `PROJECT AETHER is an ultra-low-power edge computing node engineered to operate in hostile radio environments. The prototype consists of:\n• STM32H743ZI Dual-Core Microcontroller\n• ATECC608A Hardware Cryptographic Accelerator\n• Frequency-hopping LoRaWAN / 6LoWPAN transceivers\n• Custom secure bootloader enforcing hardware SHA-256 firmware validation\n\nThe stolen prototype—AETHER-Node-07—was the only unit configured with live military test certificates and unredacted firmware source keys. If reverse engineered, the entire national testbed architecture would be permanently compromised.`,
        'TECH INTEL',
        'CONFIDENTIAL',
        3
      ],
      [
        'story_timeline',
        'Initial Known Chronology of Facts',
        'Corroborated System Events (24-SEP-2026)',
        `19:45 IST - Dr. Mathur swipes badge at ARCH main entrance.\n20:12 IST - Kavin Raj enters Hardware Bench 4 (Lab 2).\n20:30 IST - Arjun Dev accesses Firmware Workstation in Lab 1.\n20:44 IST - Meera Nair logs into Telemetry Server Rack (Server Room 1).\n21:05 IST - Rohit Sen enters Documentation Office.\n21:14 IST - Arjun Dev card swipe recorded at Corridor 2, walking toward Lab 3.\n21:30 IST - ARCH CCTV system enters 18-minute diagnostic blackout mode.\n21:36 IST - ARCH Lab 3 emergency override keypad triggered with PIN 7729*.\n21:42 IST - 4.2 GB encrypted data transfer initiated from Server Room 1 to off-shore IP 45.33.32.156.\n21:48 IST - CCTV cameras come back online.\n21:52 IST - Kavin Raj exits Lab 2 toward corridor.\n22:01 IST - Anonymous Git commit pushed to external repository with altered bootloader watermark.\n22:15 IST - Off-shore telemetry tunnel terminates.\n22:20 IST - Prototype AETHER-Node-07 heartbeat beacon drops offline.\n22:45 IST - Night security discovers victim body.`,
        'CHRONOLOGY',
        'CONFIDENTIAL',
        4
      ],
      [
        'story_questions',
        'Key Investigative Questions',
        'Requirements for Case Resolution',
        `As the lead forensic team, your final report must definitively address:\n1. Who authorized or caused the 18-minute CCTV blackout at 21:30?\n2. Whose PIN code or credentials were used on the ARCH Lab 3 emergency keypad at 21:36?\n3. What was the exact physiological cause of Dr. Mathur\'s death, and who had access to the chemical agent?\n4. What was the destination of the 4.2 GB data burst from Server Room 1, and who initiated it?\n5. Who physically stole the AETHER-Node-07 prototype, and where is the physical artifact now?`,
        'OBJECTIVES',
        'RESTRICTED',
        5
      ]
    ];

    for (const [secId, title, sub, content, badge, classif, sortOrder] of storySections) {
      run(`
        INSERT OR REPLACE INTO case_story_sections (section_id, title, subtitle, content, badge, classification, sort_order, is_published)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `, [secId, title, sub, content, badge, classif, sortOrder]);
    }

    // 9. Suspect Profiles
    const suspectsList = [
      [
        'SUSP-01',
        'Arjun Dev',
        'Lead Firmware Developer / Architect',
        'Embedded Systems Division',
        '/assets/images/suspects/arjun_dev.jpg',
        'Colleague of victim for 3 years; frequent disagreements over open-sourcing AETHER code.',
        `"I was at my workstation in Lab 1 the whole evening working on the cryptographic handshake. Yes, I walked past Lab 3 around 21:14 to grab tea from the pantry, but I never entered Dr. Mathur's room. He was alive when I walked past. The git commit pushed at 22:01 was an automated CI/CD build script triggered by my earlier pull request. I had nothing to do with the prototype disappearing."`,
        'Claimed: Lab 1 Firmware Workstation from 20:30 to 22:31.',
        '20:30 Ingress Lab 1; 21:14 Ingress Corridor 2; 22:01 Git push timestamp; 22:31 Workstation lock.',
        'Deep intellectual dispute over intellectual property ownership; received lucrative overseas employment offer from competitor SypherX Defense contingent on delivering working AETHER demo.',
        'EVD-026-01 (Corridor badge log at 21:14), EVD-026-02 (Tor handshake at 21:28), EVD-026-04 (Firmware dump string references)'
      ],
      [
        'SUSP-02',
        'Kavin Raj',
        'Hardware & RF Engineer',
        'Hardware Engineering Wing',
        '/assets/images/suspects/kavin_raj.jpg',
        'Mentored by Dr. Mathur; had sole access to Lab 2 chemical etching solvents and peptide synthesis tools.',
        `"I was troubleshooting the antenna balun at Hardware Bench 4 in Lab 2. I left at 21:52 because my soldering iron tip burned out. Dr. Mathur's door was locked from the outside. I didn't see anyone in the hallway. Why would I steal Node-07 when I built half of the PCB myself? The watermark in the bootloader? I write 'PATCH_BY_KR26' on all my test branches, anyone could have copied that code from our internal SVN."`,
        'Claimed: Lab 2 Hardware Bench 4 from 20:12 to 21:52.',
        '20:12 Ingress Lab 2; 21:52 Exit Lab 2; 22:05 Spotted near rear parking gate.',
        'Facing disciplinary action for taking lab microcontrollers home; significant financial debts from cryptocurrency margin calls.',
        'EVD-026-03 (Autopsy report linking solvent trace to Lab 2), EVD-026-04 (Watermark PATCH_BY_KR26 in firmware), EVD-026-07 (Damaged ATECC608A crypto dongle return)'
      ],
      [
        'SUSP-03',
        'Meera Nair',
        'Data Systems & Mesh Telemetry Specialist',
        'Network Operations Wing',
        '/assets/images/suspects/meera_nair.jpg',
        'Direct report to Dr. Mathur; configured the cloud telemetry bridge and data retention pipelines.',
        `"Dr. Mathur specifically asked me to run a full 4-hour telemetry benchmark between 20:45 and 22:15. The 4.2 GB data transfer was an encrypted cloud sync to our AWS test bucket. If someone routed it to an off-shore IP, my credentials must have been hijacked while I stepped out to check server rack B. I was inside Server Room 1 the entire time—the biometric lock logs prove I never left."`,
        'Claimed: Server Room 1 continuously from 20:44 to 22:15.',
        '20:44 Ingress Server Room 1; 21:42 4.2GB transfer started; 22:15 Transfer complete & exit.',
        'Believed Dr. Mathur was going to publish their joint research without granting her co-first authorship.',
        'EVD-026-02 (4.2GB HTTPS exfiltration to 45.33.32.156), EVD-026-07 (Gigabit Packet Sniffer Tap registered in her custody)'
      ],
      [
        'SUSP-04',
        'Rohit Sen',
        'QA, Testing & Facility Documentation',
        'Operations & Security Oversight',
        '/assets/images/suspects/rohit_sen.jpg',
        'Responsible for security documentation, backup access keys, and ARCH camera maintenance schedules.',
        `"I was drafting the weekly sprint documentation in the admin office. The CCTV cameras had a scheduled diagnostic firmware test scheduled for 21:30—I logged that maintenance ticket two days ago! I had no reason to go near Lab 3. I left at 22:04 because my shift was over. I don't know who used the emergency PIN code, but that code was written on a whiteboard inside the security office."`,
        'Claimed: Documentation Office from 21:05 to 22:04.',
        '21:05 Ingress Documentation Office; 21:30 CCTV diagnostic bypass triggered; 22:04 Exit to parking lot.',
        'Recently passed over for promotion; held physical custody of master emergency override fobs and CCTV administration passwords.',
        'EVD-026-01 (CCTV bypass mode at 21:30), EVD-026-05 (CCTV frame showing fleeing subject right as cameras booted back up at 21:38), EVD-026-07 (Master Keycard Override Fob returned unlogged)'
      ]
    ];

    for (const [code, name, role, dept, avatar, rel, stmt, where, timeline, motive, evidenceRef] of suspectsList) {
      run(`
        INSERT OR REPLACE INTO suspects (suspect_code, name, role, department, avatar_url, relationships, statement, whereabouts, timeline_events, potential_motive, supporting_evidence, is_visible)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [code, name, role, dept, avatar, rel, stmt, where, timeline, motive, evidenceRef]);
    }

    // 10. Seed Evidence Items (with real SHA-256 hashes computed from files on disk!)
    const uploadDir = config.UPLOADS_DIR;

    const evidenceItems = [
      {
        code: 'EVD-026-01',
        name: 'ARCH Facility Ingress/Egress Door Telemetry Logs',
        file: 'access_logs_arch_lab.txt',
        type: 'text',
        mime: 'text/plain',
        category: 'System Logs',
        classif: 'CRITICAL',
        desc: 'Electronic access card swipe records, keypad override timestamps, and door sensor telemetry from ARCH facility SentriLock system on 24-Sep-2026.',
        hints: 'Cross-check the emergency PIN keypad override at 21:36 with the CCTV maintenance blackout period.',
        score: 15
      },
      {
        code: 'EVD-026-02',
        name: 'Network Flow & Packet Capture Analysis',
        file: 'network_traffic_capture.csv',
        type: 'csv',
        mime: 'text/csv',
        category: 'Network Packet',
        classif: 'CRITICAL',
        desc: 'Captured network flow telemetry showing anomalous outbound SSH, TLS Tor-relay handshakes, and a 4.2GB encrypted data burst during the incident window.',
        hints: 'Look at the destination IP 45.33.32.156 and compare timestamps with Meera Nair and Arjun Dev activities.',
        score: 15
      },
      {
        code: 'EVD-026-03',
        name: 'Official Medico-Legal Forensic Autopsy Report',
        file: 'victim_autopsy_summary.pdf',
        type: 'pdf',
        mime: 'application/pdf',
        category: 'Document',
        classif: 'CRITICAL',
        desc: 'Comprehensive post-mortem examination report of Dr. Alok Mathur by State Forensic Laboratory. Contains toxicology findings and precise time-of-death estimate.',
        hints: 'Examine the toxicological finding of Succinylcholine trace and the 28-gauge puncture mark on the left wrist.',
        score: 20
      },
      {
        code: 'EVD-026-04',
        name: 'AETHER-Node-07 Firmware Hex & Assembly Dump',
        file: 'firmware_hex_dump.txt',
        type: 'text',
        mime: 'text/plain',
        category: 'Memory Dump',
        classif: 'CRITICAL',
        desc: 'Hexadecimal memory dump acquired via JTAG interface from prototype testing node. Contains embedded encryption keys, C2 URL, and unauthorized developer watermark.',
        hints: 'Inspect the string at 0x70 pointing to rogue C2 and the bootloader watermark at 0xA0.',
        score: 15
      },
      {
        code: 'EVD-026-05',
        name: 'ARCH Corridor CCTV Motion Surveillance Still',
        file: 'cctv_frame_corridor.jpg',
        type: 'image',
        mime: 'image/jpeg',
        category: 'Physical Audio/Video',
        classif: 'SECONDARY',
        desc: 'Restored security camera frame captured at 21:38:12 IST immediately following the CCTV system diagnostic reboot. Shows subject fleeing Lab 3 corridor.',
        hints: 'Note the subject clothing, gait, and direction of movement relative to Lab 2 and the rear emergency exit.',
        score: 15
      },
      {
        code: 'EVD-026-06',
        name: 'Acoustic Surveillance Sensor Audio Intercept',
        file: 'acoustic_sensor_intercept.wav',
        type: 'audio',
        mime: 'audio/wav',
        category: 'Physical Audio/Video',
        classif: 'SECONDARY',
        desc: 'Acoustic surveillance capture from prototype microphone sensor deployed in ARCH Lab 3. Audio spectrum reveals keypad beeps, struggle sounds, and high-frequency pulse.',
        hints: 'Analyze the tone shift between 1.2s and 1.8s corresponding to keypad DTMF tone entry.',
        score: 10
      },
      {
        code: 'EVD-026-07',
        name: 'Hardware Custodial Transfer Ledger',
        file: 'encrypted_ledger.csv',
        type: 'csv',
        mime: 'text/csv',
        category: 'Document',
        classif: 'BACKGROUND',
        desc: 'Laboratory asset custody tracking ledger documenting custody, serial numbers, checkouts, and missing/damaged items for the AETHER project.',
        hints: 'Review who checked out the Master Keycard Override Fob and the ATECC608A cryptographic dongle.',
        score: 10
      }
    ];

    for (const item of evidenceItems) {
      const filePath = path.join(uploadDir, item.file);
      let size = 0;
      let sha256 = 'unknown';

      if (fs.existsSync(filePath)) {
        size = fs.statSync(filePath).size;
        sha256 = calculateFileSha256(filePath);
      }

      run(`
        INSERT OR REPLACE INTO evidence (
          evidence_code, display_name, original_filename, stored_filename, file_path,
          file_type, mime_type, file_size, sha256_hash, category, classification,
          description, hints, score_value, visibility_rule, is_available, case_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'immediate', 1, 'TLA-026')
      `, [
        item.code,
        item.name,
        item.file,
        item.file,
        item.file,
        item.type,
        item.mime,
        size,
        sha256,
        item.category,
        item.classif,
        item.desc,
        item.hints,
        item.score
      ]);
    }

    // 11. Final Report Template (11 Sections)
    const reportSections = [
      [
        'case_summary',
        1,
        '1. Case Summary',
        'Provide an executive summary of Case TLA-026, stating the incident classification, principal parties involved, and high-level outcome of the digital forensics investigation.',
        50,
        300,
        1,
        10
      ],
      [
        'incident_overview',
        2,
        '2. Incident Overview',
        'Detail the location, environmental context of ARCH Lab 3, discovery of Dr. Alok Mathur, condition of the Faraday enclosure, and the scope of PROJECT AETHER.',
        75,
        400,
        1,
        10
      ],
      [
        'investigation_objectives',
        3,
        '3. Investigation Objectives',
        'Enumerate the formal investigative questions formulated by your team and the cyber forensics protocols adhered to during analysis.',
        40,
        250,
        1,
        5
      ],
      [
        'evidence_examined',
        4,
        '4. Evidence Examined',
        'Catalog all digital and physical evidence items examined (EVD-026-01 through EVD-026-07). Include SHA-256 hashes and chain-of-custody remarks.',
        100,
        500,
        1,
        10
      ],
      [
        'timeline_of_events',
        5,
        '5. Timeline of Events',
        'Present the definitive, reconstructed chronological timeline of events on 24-SEP-2026. Specify exact timestamps (with 12-hour AM/PM notation), actor movements, and corroborating evidence codes.',
        150,
        800,
        1,
        15
      ],
      [
        'suspect_analysis',
        6,
        '6. Suspect Analysis',
        'Systematic forensic evaluation of all four suspects (Arjun Dev, Kavin Raj, Meera Nair, Rohit Sen). Analyze their alibis, opportunity, access capabilities, and technical contradictions.',
        150,
        800,
        1,
        15
      ],
      [
        'findings',
        7,
        '7. Findings & Technical Discoveries',
        'Detail your core forensic discoveries: network exfiltration destination, bootloader watermark authorship, toxicological cause of death, and keypad override mechanics.',
        100,
        600,
        1,
        15
      ],
      [
        'supporting_evidence_references',
        8,
        '8. Supporting Evidence & References',
        'Provide precise citations mapping your conclusions directly to specific lines in access logs, CSV flow records, hex dump offsets, or CCTV imagery.',
        50,
        400,
        1,
        5
      ],
      [
        'alternative_hypotheses',
        9,
        '9. Alternative Hypotheses',
        'Evaluate and refute at least two alternative explanations (e.g., accidental electrical shock, external unauthorized intrusion, solo theft without accomplice). Explain why evidence contradicts them.',
        60,
        400,
        1,
        5
      ],
      [
        'conclusion',
        10,
        '10. Conclusion & Culprit Identification',
        'State your definitive conclusion. Identify the primary culprit(s), accomplices if any, complete modus operandi, and recommendation for legal prosecution.',
        75,
        400,
        1,
        10
      ],
      [
        'team_details',
        11,
        '11. Investigator / Team Details',
        'List all investigator names, institutional affiliations, roles played during the investigation, and formal declaration of investigative integrity.',
        30,
        200,
        1,
        0
      ]
    ];

    for (const [key, num, title, instr, minW, maxW, mand, maxS] of reportSections) {
      run(`
        INSERT OR REPLACE INTO report_templates (section_key, section_number, title, instructions, min_words, max_words, is_mandatory, max_score, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [key, num, title, instr, minW, maxW, mand, maxS, num]);
    }

    // 12. Additional Sample Participants for Leaderboard
    run(`
      INSERT OR REPLACE INTO users (id, full_name, email, password_hash, college, department, year_of_study, role, status)
      VALUES 
      (3, 'Agent Ananya Rao', 'ananya@ssec.ac.in', ?, 'Sree Sakthi Engineering College', 'Information Technology', '3rd Year', 'participant', 'active'),
      (4, 'Agent Vikramaditya', 'vikram@ssec.ac.in', ?, 'Sree Sakthi Engineering College', 'Electronics & Communication', '4th Year', 'participant', 'active')
    `, [userPasswordHash, userPasswordHash]);

    // Seed Sample Leaderboard Entries
    const sampleScores = [
      [1, 2, 'CipherTrack Alpha (Agent Dhruv Saxena)', 88.5, 0.0, 88.5, 7420, '2026-09-24T23:45:00.000Z', 1, 1],
      [null, 3, 'Spectre Forensics (Agent Ananya Rao)', 84.0, 0.0, 84.0, 8100, '2026-09-24T23:55:00.000Z', 1, 2],
      [null, 4, 'ByteHunters Unit (Agent Vikramaditya)', 79.5, 5.0, 74.5, 9200, '2026-09-25T00:10:00.000Z', 1, 3]
    ];

    for (const [teamId, userId, name, tot, pen, fin, timeTaken, subAt, repSub, rank] of sampleScores) {
      run(`
        INSERT OR REPLACE INTO leaderboard_scores (user_id, team_id, team_or_user_name, total_score, penalty, final_score, time_taken_seconds, submitted_at, reports_submitted, rank)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [userId, teamId, name, tot, pen, fin, timeTaken, subAt, repSub, rank]);
    }

    // 13. Initial Audit Log
    run(`
      INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, target_object, outcome, details_json)
      VALUES (1, 'System Bootstrap', 'admin', 'SYSTEM_INITIALIZATION', 'DATABASE', 'SUCCESS', '{"message":"Database seeded with forensic case TLA-026 default parameters"}')
    `);
  });

  console.log('[SEED] Database initialized and seeded successfully.');
}

if (require.main === module) {
  seedDatabase().catch((err) => {
    console.error('[SEED ERROR]', err);
    process.exit(1);
  });
}

module.exports = {
  seedDatabase
};

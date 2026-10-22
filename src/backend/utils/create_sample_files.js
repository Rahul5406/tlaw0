const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', '..', '..', 'data', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. access_logs_arch_lab.txt
const accessLogContent = `================================================================================
ARCH RESEARCH FACILITY - AUTOMATED INGRESS/EGRESS ACCESS TELEMETRY
FACILITY CODE: SSEC-ARCH-03 | DATE OF RECORD: 24-SEP-2026
LOGGING SYSTEM: SentriLock Pro v4.28 (Hardware Revision D)
================================================================================
TIMESTAMP               DOOR_ID        BADGE_ID     HOLDER_NAME           AUTH_STATUS  SENSOR_NOTES
------------------------------------------------------------------------------------------------
2026-09-24 19:45:10     ARCH-EXT-01    SSEC-F092    Prof. Alok Mathur     GRANTED      Main entry point
2026-09-24 20:12:04     ARCH-LAB-02    SSEC-E114    Kavin Raj             GRANTED      Hardware bench #4
2026-09-24 20:30:19     ARCH-LAB-01    SSEC-E102    Arjun Dev             GRANTED      Firmware workstation
2026-09-24 20:44:55     ARCH-SRV-01    SSEC-E138    Meera Nair            GRANTED      Telemetry rack entry
2026-09-24 21:05:12     ARCH-DOC-03    SSEC-E149    Rohit Sen             GRANTED      Documentation office
2026-09-24 21:14:38     ARCH-CORR-02   SSEC-E102    Arjun Dev             GRANTED      Heading toward Lab 3
2026-09-24 21:28:44     ARCH-LAB-03    SSEC-F092    Prof. Alok Mathur     GRANTED      Project Faraday Vault
2026-09-24 21:30:00     ARCH-CCTV-SYS  --           SYSTEM_ADMIN          BYPASS_MODE  CCTV loop offline (18m)
2026-09-24 21:36:22     ARCH-LAB-03    UNKNOWN      OVERRIDE_KEYPAD       GRANTED      PIN: 7729* (EMERGENCY)
2026-09-24 21:48:15     ARCH-CCTV-SYS  --           SYSTEM_ADMIN          NORMAL_MODE  CCTV restored
2026-09-24 21:52:03     ARCH-LAB-02    SSEC-E114    Kavin Raj             GRANTED      Exit toward corridor
2026-09-24 22:04:19     ARCH-CORR-01   SSEC-E149    Rohit Sen             GRANTED      Exit to parking lot
2026-09-24 22:15:33     ARCH-SRV-01    SSEC-E138    Meera Nair            GRANTED      High-speed link terminated
2026-09-24 22:31:02     ARCH-LAB-01    SSEC-E102    Arjun Dev             GRANTED      Workstation locked
2026-09-24 22:45:19     ARCH-LAB-03    SSEC-SEC04   Night Watchman        ALERT        UNRESPONSIVE BODY FOUND
================================================================================
SECURITY NOTICE: KEYPAD OVERRIDE AT 21:36:22 CARRIES NO BADGE SIGNATURE.
CONTACT FORENSIC INVESTIGATOR IMMEDIATELY.
`;

fs.writeFileSync(path.join(uploadDir, 'access_logs_arch_lab.txt'), accessLogContent, 'utf8');

// 2. network_traffic_capture.csv
const networkCsvContent = `timestamp,source_ip,destination_ip,protocol,src_port,dest_port,bytes_transferred,flags,packet_signature,anomaly_flag
2026-09-24 21:00:15,10.14.8.102,10.14.8.1,TCP,54210,443,1420,ACK,AETHER-BEACON-INIT,NORMAL
2026-09-24 21:15:22,10.14.8.114,192.168.100.4,SSH,49152,22,8904,PSH-ACK,DEV-TERMINAL-DEBUG,NORMAL
2026-09-24 21:28:50,10.14.8.102,185.220.101.5,TLS,58124,8443,62410,SYN-ACK,TOR-RELAY-HANDSHAKE,SUSPICIOUS
2026-09-24 21:35:12,10.14.8.200,10.14.8.102,UDP,61000,5005,512,NULL,PROTOTYPE-SENSOR-STREAM,CRITICAL
2026-09-24 21:42:09,10.14.8.138,45.33.32.156,HTTPS,55230,443,4294967296,ACK,ENCRYPTED-BLOB-EXFILTRATION,CRITICAL
2026-09-24 22:01:45,10.14.8.149,140.82.121.4,SSH,52100,22,23410,ACK,GIT-PUSH-ANONYMOUS-COMMIT,SUSPICIOUS
2026-09-24 22:15:00,10.14.8.138,45.33.32.156,TCP,55230,443,128,FIN-ACK,TUNNEL-CLOSE,NORMAL
2026-09-24 22:20:11,10.14.8.200,0.0.0.0,NULL,0,0,0,RST,AETHER-NODE-07-OFFLINE,CRITICAL
`;

fs.writeFileSync(path.join(uploadDir, 'network_traffic_capture.csv'), networkCsvContent, 'utf8');

// 3. firmware_hex_dump.txt
const firmwareContent = `;; ============================================================================
;; PROJECT AETHER - HARDWARE SENSOR NODE REVISION 7 (AETHER-Node-07)
;; MICROCONTROLLER: STM32H743ZI | CRYPTO ENGINE: ATECC608A
;; DUMP ACQUIRED: JTAG INTERFACE 25-SEP-2026 03:15 IST (CYRA LABS)
;; ============================================================================

00000000: 00 00 02 20 51 04 00 08  95 04 00 08 97 04 00 08  ... Q...........
00000010: 00 00 00 00 00 00 00 00  00 00 00 00 99 04 00 08  ................
00000020: 00 00 00 00 00 00 00 00  9B 04 00 08 9D 04 00 08  ................
00000030: 41 45 54 48 45 52 5F 56  32 5F 50 52 4F 54 4F 43  AETHER_V2_PROTOC
00000040: 4F 4C 5F 4B 45 59 3D 66  38 63 32 65 32 33 33 2D  OL_KEY=f8c2e233-
00000050: 31 66 30 38 2D 34 35 65  32 2D 39 31 34 33 2D 31  1f08-45e2-9143-1
00000060: 65 66 66 35 66 38 35 39  33 36 36 00 00 00 00 00  eff5f859366.....
00000070: 68 74 74 70 73 3A 2F 2F  63 32 2E 61 65 74 68 65  https://c2.aethe
00000080: 72 2D 65 78 66 69 6C 2E  69 6F 2F 61 70 69 2F 73  r-exfil.io/api/s
00000090: 69 6E 6B 00 55 4E 41 55  54 48 4F 52 49 5A 45 44  ink.UNAUTHORIZED
000000A0: 5F 42 4F 4F 54 4C 4F 41  44 45 52 5F 50 41 54 43  _BOOTLOADER_PATC
000000B0: 48 5F 42 59 5F 4B 52 32  36 00 00 00 00 00 00 00  H_BY_KR26.......

;; FORENSIC NOTE:
;; String at 0x70 points to rogue telemetry drop: c2.aether-exfil.io
;; Bootloader watermark at 0xA0 contains signature: "PATCH_BY_KR26" (matches suspect Kavin Raj)
;; Key at 0x40 is master AES-256 decryption token for archived sensor packets.
`;

fs.writeFileSync(path.join(uploadDir, 'firmware_hex_dump.txt'), firmwareContent, 'utf8');

// 4. encrypted_ledger.csv
const ledgerContent = `asset_id,item_description,custodian,authorized_zone,checkout_date,return_date,status,discrepancy_flag
AST-091,Faraday Enclosure Unit 3,Prof. Alok Mathur,ARCH-LAB-03,2026-09-01,PERMANENT,IN_SITU,NONE
AST-092,AETHER-Node-07 (Core Prototype),Prof. Alok Mathur,ARCH-LAB-03,2026-09-20,2026-09-25,MISSING,CRITICAL_THEFT
AST-093,ATECC608A Cryptographic Dongle,Kavin Raj,ARCH-LAB-02,2026-09-22,2026-09-24,RETURNED_DAMAGED,SUSPICIOUS
AST-094,Gigabit Packet Sniffer Tap,Meera Nair,ARCH-SRV-01,2026-09-24,PENDING,IN_USE,HIGH_DATA_FLOW
AST-095,Master Keycard Override Fob,Rohit Sen,SECURITY_OFFICE,2026-09-24,2026-09-24,RETURNED_UNLOGGED,AUDIT_FAILURE
`;

fs.writeFileSync(path.join(uploadDir, 'encrypted_ledger.csv'), ledgerContent, 'utf8');

// 5. victim_autopsy_summary.pdf (Generate genuine standalone valid PDF)
function generatePdf() {
  const contentStream = `BT
/F1 18 Tf
50 750 Td
(MEDICO-LEGAL FORENSIC POST-MORTEM REPORT) Tj
/F1 10 Tf
0 -20 Td
(DEPARTMENT OF FORENSIC PATHOLOGY - CASE FILE: TLA-026-AUT) Tj
0 -20 Td
(DECEASED: Prof. Alok Mathur | AGE: 54 | DATE OF INCIDENT: 24-SEP-2026) Tj
0 -15 Td
(EXAMINATION LOCATION: Central District Forensic Morgue) Tj
0 -15 Td
(LEAD PATHOLOGIST: Dr. S. Ramanathan, MD (Forensic Medicine)) Tj
0 -25 Td
/F1 12 Tf
(1. EXTERNAL AND ANATOMICAL FINDINGS:) Tj
/F1 10 Tf
0 -18 Td
(- Subject discovered prone on ARCH Lab 3 floor adjacent to open Faraday cabinet.) Tj
0 -15 Td
(- Estimated time of death: Between 21:40 and 22:15 IST, 24 September 2026.) Tj
0 -15 Td
(- Petechial micro-hemorrhages identified in conjunctivae.) Tj
0 -15 Td
(- Puncture wound (28-gauge) discovered on dorsal aspect of left wrist.) Tj
0 -25 Td
/F1 12 Tf
(2. TOXICOLOGICAL ANALYSIS:) Tj
/F1 10 Tf
0 -18 Td
(- Blood serum reveals acute lethal concentration of Succinylcholine trace metabolite.) Tj
0 -15 Td
(- Rapid neuromuscular paralysis induced diaphragmatic arrest within 3 to 5 minutes.) Tj
0 -15 Td
(- Chemical signature matched laboratory Grade-9 peptide synthesis solvent present in Lab 2.) Tj
0 -25 Td
/F1 12 Tf
(3. PRELIMINARY CORONER CONCLUSION:) Tj
/F1 10 Tf
0 -18 Td
(- MANNER OF DEATH: HOMICIDE BY INDUCED ASPHYXIA / NEUROPARALYTIC AGENT.) Tj
0 -15 Td
(- Natural causes, cardiac infarct, and accidental electric shock are EXCLUDED.) Tj
0 -15 Td
(- The crime occurred prior to the physical theft of prototype AETHER-Node-07.) Tj
0 -30 Td
(SIGNATURE: [SEAL AFFIXED - STATE FORENSIC LABORATORY]) Tj
ET`;

  const streamLength = Buffer.byteLength(contentStream, 'utf8');

  const pdfBody = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${contentStream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
000000${String(300 + streamLength).padStart(4, '0')} 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${370 + streamLength}
%%EOF`;

  fs.writeFileSync(path.join(uploadDir, 'victim_autopsy_summary.pdf'), pdfBody, 'utf8');
}
generatePdf();

// 6. Audio/Video sample: Create a valid tiny webm/mp4 or wav audio file
// Let's create an uncompressed valid 1-second 8kHz WAV audio file for acoustic sensor playback
function generateWav() {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const durationSec = 3;
  const numSamples = sampleRate * durationSec;
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate synthetic audio waveform (simulated acoustic surveillance hum and beep)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // 440 Hz tone with noise and intermittent 880 Hz pulse
    const freq = (t > 1.2 && t < 1.8) ? 880 : 220;
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.4 * 32767;
    buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
  }

  fs.writeFileSync(path.join(uploadDir, 'acoustic_sensor_intercept.wav'), buffer);
}
generateWav();

console.log('Sample evidence files successfully created in', uploadDir);

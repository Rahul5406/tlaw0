const http = require('http');
const fs = require('fs');
const path = require('path');

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function verifyAudio() {
  console.log('============================================================');
  console.log('  TLA-026 BACKGROUND AUDIO INTEGRATION VERIFICATION');
  console.log('============================================================\n');

  console.log('--- 1. Testing Audio File Endpoints & Byte-Range Streaming ---');
  const headPublic = await fetchUrl('http://localhost:3000/public/background.mp3', { method: 'HEAD' });
  console.log('/public/background.mp3 status:', headPublic.status, 'Type:', headPublic.headers['content-type'], 'Length:', headPublic.headers['content-length']);
  if (headPublic.status !== 200 || !headPublic.headers['content-type'].includes('audio')) {
    throw new Error('Failed to fetch /public/background.mp3');
  }

  const headRoot = await fetchUrl('http://localhost:3000/background.mp3', { method: 'HEAD' });
  console.log('/background.mp3 status:', headRoot.status, 'Type:', headRoot.headers['content-type'], 'Length:', headRoot.headers['content-length']);
  if (headRoot.status !== 200 || !headRoot.headers['content-type'].includes('audio')) {
    throw new Error('Failed to fetch /background.mp3');
  }

  const rangeRes = await fetchUrl('http://localhost:3000/public/background.mp3', { headers: { 'Range': 'bytes=0-1023' } });
  console.log('Range 0-1023 status:', rangeRes.status, 'Content-Range:', rangeRes.headers['content-range'], 'Content-Length:', rangeRes.headers['content-length']);
  if (rangeRes.status !== 206 || rangeRes.headers['content-length'] !== '1024') {
    throw new Error('HTTP 206 Partial Content range request failed for audio');
  }

  console.log('\n--- 2. Testing Frontend DOM & HTML Markup ---');
  const indexRes = await fetchUrl('http://localhost:3000/');
  const htmlChecks = {
    hasAudioElement: indexRes.body.includes('<audio') && indexRes.body.includes('tla-background-audio'),
    hasLoopAttribute: indexRes.body.includes('loop'),
    hasPreloadAuto: indexRes.body.includes('preload="auto"'),
    hasPublicMp3Source: indexRes.body.includes('src="/public/background.mp3"'),
    hasRootMp3Source: indexRes.body.includes('src="/background.mp3"'),
    hasNavAudioMount: indexRes.body.includes('id="nav-audio-mount"')
  };
  console.table(htmlChecks);
  for (const [k, v] of Object.entries(htmlChecks)) {
    if (!v) throw new Error(`HTML check failed: ${k}`);
  }

  console.log('\n--- 3. Testing CSS Styles for Audio Control Pill & Volume Slider ---');
  const layoutRes = await fetchUrl('http://localhost:3000/styles/layout.css');
  const cssChecks = {
    hasAudioControlPill: layoutRes.body.includes('.audio-control-pill'),
    hasAudioActiveState: layoutRes.body.includes('.audio-control-pill.active'),
    hasAudioToggleBtn: layoutRes.body.includes('.audio-toggle-btn'),
    hasVolumeSlider: layoutRes.body.includes('.audio-volume-slider'),
    hasVolumeLabel: layoutRes.body.includes('.audio-volume-label'),
    hasForensicEmeraldGlow: layoutRes.body.includes('var(--forensic-emerald-glow)')
  };
  console.table(cssChecks);
  for (const [k, v] of Object.entries(cssChecks)) {
    if (!v) throw new Error(`CSS check failed: ${k}`);
  }

  console.log('\n--- 4. Testing AudioController Component Structure & Logic ---');
  const audioCtrlPath = path.join(__dirname, '..', 'frontend', 'js', 'components', 'AudioController.js');
  const audioCode = fs.readFileSync(audioCtrlPath, 'utf8');
  const logicChecks = {
    hasSingletonExport: audioCode.includes('export const AudioController'),
    hasDefaultVolume20: audioCode.includes('this.defaultVolume = 0.20'),
    hasMaxVolumeCap50: audioCode.includes('this.maxVolume = 0.50'),
    hasLocalStorageEnabled: audioCode.includes('localStorage.getItem(\'tla_audio_enabled\')'),
    hasLocalStorageVolume: audioCode.includes('localStorage.getItem(\'tla_audio_volume\')'),
    hasAdminRoutePause: audioCode.includes('route === \'/admin\''),
    hasAutoplayRestrictionHandling: audioCode.includes('NotAllowedError'),
    hasAudioOnLabel: audioCode.includes('♫ AUDIO ON'),
    hasAudioOffLabel: audioCode.includes('♫ AUDIO OFF')
  };
  console.table(logicChecks);
  for (const [k, v] of Object.entries(logicChecks)) {
    if (!v) throw new Error(`Logic check failed: ${k}`);
  }

  console.log('\n============================================================');
  console.log('  ALL TLA-026 BACKGROUND AUDIO VERIFICATION CHECKS PASSED!');
  console.log('============================================================');
}

verifyAudio().catch(err => {
  console.error('Audio verification failure:', err);
  process.exit(1);
});

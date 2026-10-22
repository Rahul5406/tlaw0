const http = require('http');

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

async function verifyAll() {
  console.log('--- 1. Testing HTML and Video Element ---');
  const indexRes = await fetchUrl('http://localhost:3000/');
  console.log('Index HTML status:', indexRes.status);
  
  const checks = {
    hasVideoTag: indexRes.body.includes('<video') && indexRes.body.includes('cinematic-bg-video'),
    hasAutoplay: indexRes.body.includes('autoplay'),
    hasLoop: indexRes.body.includes('loop'),
    hasMuted: indexRes.body.includes('muted'),
    hasPlaysinline: indexRes.body.includes('playsinline'),
    hasPreload: indexRes.body.includes('preload="auto"'),
    hasPublicSource: indexRes.body.includes('src="/public/background.mp4"'),
    hasRootSource: indexRes.body.includes('src="/background.mp4"'),
    hasOverlay: indexRes.body.includes('cinematic-bg-overlay'),
    hasGrid: indexRes.body.includes('cinematic-bg-grid'),
    hasAppShell: indexRes.body.includes('id="app"'),
    hasAliasVideoLayer: indexRes.body.includes('background-video-layer'),
    hasAliasOverlay: indexRes.body.includes('background-overlay'),
    hasAliasWebsiteContent: indexRes.body.includes('website-content')
  };
  
  console.table(checks);
  for (const [key, val] of Object.entries(checks)) {
    if (!val) throw new Error(`Check failed: ${key}`);
  }

  console.log('\n--- 2. Testing Video Streaming & Partial Content (HTTP 206) ---');
  const headPublic = await fetchUrl('http://localhost:3000/public/background.mp4', { method: 'HEAD' });
  console.log('/public/background.mp4:', headPublic.status, headPublic.headers['content-type'], headPublic.headers['content-length']);
  if (headPublic.status !== 200 || headPublic.headers['content-type'] !== 'video/mp4') {
    throw new Error('/public/background.mp4 failed');
  }

  const headRoot = await fetchUrl('http://localhost:3000/background.mp4', { method: 'HEAD' });
  console.log('/background.mp4:', headRoot.status, headRoot.headers['content-type'], headRoot.headers['content-length']);
  if (headRoot.status !== 200 || headRoot.headers['content-type'] !== 'video/mp4') {
    throw new Error('/background.mp4 failed');
  }

  const rangeRes = await fetchUrl('http://localhost:3000/public/background.mp4', { headers: { 'Range': 'bytes=0-1023' } });
  console.log('Range 0-1023 status:', rangeRes.status, 'Content-Range:', rangeRes.headers['content-range'], 'Length:', rangeRes.headers['content-length']);
  if (rangeRes.status !== 206 || rangeRes.headers['content-length'] !== '1024') {
    throw new Error('Range request failed');
  }

  console.log('\n--- 3. Testing CSS Integrity & Video Visibility ---');
  const layoutRes = await fetchUrl('http://localhost:3000/styles/layout.css');
  const resetRes = await fetchUrl('http://localhost:3000/styles/reset.css');
  const varRes = await fetchUrl('http://localhost:3000/styles/variables.css');
  const compRes = await fetchUrl('http://localhost:3000/styles/components.css');

  const cssChecks = {
    hasCover: layoutRes.body.includes('object-fit: cover'),
    hasFixedVideoLayer: layoutRes.body.includes('position: fixed'),
    hasVideoOpacity100: layoutRes.body.includes('opacity: 1;'),
    hasFilterNone: layoutRes.body.includes('filter: none;'),
    hasOverlay025: layoutRes.body.includes('rgba(0, 0, 0, 0.25)'),
    hasPointerEventsNone: layoutRes.body.includes('pointer-events: none'),
    hasAppZIndex: layoutRes.body.includes('z-index: 2;') || layoutRes.body.includes('z-index: 10;'),
    hasAppTransparent: layoutRes.body.includes('background: transparent;'),
    hasBodyTransparent: resetRes.body.includes('background-color: transparent;'),
    hasHtmlBgPrimary: resetRes.body.includes('background-color: var(--bg-primary);'),
    hasCardBackdropBlur: compRes.body.includes('backdrop-filter: blur'),
    hasTranslucentSurface: varRes.body.includes('rgba(14, 20, 28, 0.68)')
  };
  console.table(cssChecks);
  for (const [key, val] of Object.entries(cssChecks)) {
    if (!val) throw new Error(`CSS check failed: ${key}`);
  }

  console.log('\n--- 4. Testing API Endpoints ---');
  const healthRes = await fetchUrl('http://localhost:3000/api/health');
  console.log('Health check:', healthRes.status, JSON.parse(healthRes.body));

  const configRes = await fetchUrl('http://localhost:3000/api/event/config');
  console.log('Event config:', configRes.status, 'Keys:', Object.keys(JSON.parse(configRes.body).config).length);

  console.log('\n============================================================');
  console.log('  ALL FORENSIC VIDEO VISIBILITY CHECKS PASSED PERFECTLY!');
  console.log('============================================================');
}

verifyAll().catch(err => {
  console.error('Verification failure:', err);
  process.exit(1);
});

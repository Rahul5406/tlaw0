const { test, expect } = require('@playwright/test');

test.describe('Site smoke', () => {
  test('health endpoint reports OPERATIONAL', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('OPERATIONAL');
    expect(body.system).toContain('CyRA');
  });

  test('home page loads with branding and shell', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/THE LAST ARTIFACT/);
    await expect(page.locator('body')).toHaveAttribute('data-route', '/');
    await expect(page.locator('#site-title-display')).toHaveText('THE LAST ARTIFACT');
    await expect(page.locator('.brand-logo-badge')).toHaveText('TLA-026');
    await expect(page.locator('#main-container')).toBeVisible();
  });

  test('critical static assets are served', async ({ request }) => {
    for (const asset of ['/styles/variables.css', '/js/app.js', '/js/api.js']) {
      const res = await request.get(asset);
      expect(res.status(), asset).toBe(200);
    }
    for (const media of ['/public/background.mp3', '/public/background.mp4']) {
      const res = await request.head(media);
      expect(res.status(), media).toBe(200);
    }
  });

  test('SPA navigation switches public routes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.click('a.nav-link[href="/rules"]');
    await expect(page.locator('body')).toHaveAttribute('data-route', '/rules');
    await expect(page).toHaveURL(/\/rules$/);

    await page.click('a.nav-link[href="/story"]');
    await expect(page.locator('body')).toHaveAttribute('data-route', '/story');

    await page.click('a.nav-link[href="/leaderboard"]');
    await expect(page.locator('body')).toHaveAttribute('data-route', '/leaderboard');
  });

  test('login page renders authentication form', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.locator('#login-submit-btn')).toBeVisible();
  });

  test('protected routes redirect guests to login', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('#login-form')).toBeVisible();

    await page.goto('/workspace', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login$/);
  });
});

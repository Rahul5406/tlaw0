const { test, expect } = require('@playwright/test');

test.describe('Authentication flows', () => {
  test('investigator can log in and reach dashboard', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.click('#fill-investigator-btn');
    await page.click('#login-submit-btn');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('body')).toHaveAttribute('data-route', '/dashboard');
    await expect(page.locator('#logout-btn')).toBeVisible();
  });

  test('admin can log in and reach admin portal', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.click('#fill-admin-btn');
    await page.click('#login-submit-btn');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('body')).toHaveAttribute('data-route', '/admin');
  });

  test('logout terminates session and returns home', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.click('#fill-investigator-btn');
    await page.click('#login-submit-btn');
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.click('#logout-btn');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test('invalid credentials show error toast', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('#login-email', 'nobody@example.com');
    await page.fill('#login-password', 'WrongPassword123!');
    await page.click('#login-submit-btn');
    await expect(page.locator('#toast-container')).toContainText(/invalid|incorrect|failed|not found/i);
    await expect(page).toHaveURL(/\/login$/);
  });
});

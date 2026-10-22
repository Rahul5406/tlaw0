const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  retries: 0,
  workers: 4,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    channel: 'chrome',
    headless: true,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    actionTimeout: 8_000
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: true,
    timeout: 30_000
  }
});

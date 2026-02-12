const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 120000,
  expect: {
    timeout: 10000
  },
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    headless: false,
    ignoreHTTPSErrors: true,
    viewport: { width: 1600, height: 900 },
    actionTimeout: 15000,
    navigationTimeout: 120000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  }
});

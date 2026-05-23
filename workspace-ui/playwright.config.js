export default {
  testDir: './tests',
  timeout: 60_000,
  use: {
    headless: true,
    viewport: { width: 1440, height: 1000 },
    ignoreHTTPSErrors: true,
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
}

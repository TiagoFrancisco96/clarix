import { defineConfig, devices } from '@playwright/test';

/**
 * Clarix AI — Playwright E2E Configuration
 * Used by the on-demand GitHub Actions workflow (.github/workflows/e2e-on-demand.yml)
 * and local `npx playwright test` runs.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 30_000,

  use: {
    baseURL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

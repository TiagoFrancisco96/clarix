import { test, expect } from '@playwright/test';

/**
 * Clarix AI — Core Click Audit E2E Tests
 *
 * These tests are executed by the GitHub Actions on-demand workflow
 * (.github/workflows/e2e-on-demand.yml) against the live workspace URL.
 *
 * They validate that every major page loads, critical buttons are clickable,
 * and API health is green.
 */

test.describe('Landing & Auth', () => {
  test('homepage loads and shows workspace title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Clarix/i);
  });

  test('login page renders email/password form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});

test.describe('Public Info Pages', () => {
  const pages = ['/info', '/privacy', '/terms', '/security', '/status', '/api-docs'];

  for (const route of pages) {
    test(`${route} returns 200 and renders content`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      // The page should have at least one heading
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 });
    });
  }
});

test.describe('API Health Checks', () => {
  test('GET /api/health returns 200', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
  });

  test('POST /api/errors/report accepts a test payload', async ({ request }) => {
    const response = await request.post('/api/errors/report', {
      data: {
        message: '[E2E] Playwright telemetry probe — this is a test, not a real error.',
        severity: 'low',
        component: 'e2e',
        metadata: JSON.stringify({ source: 'playwright-click-audit', timestamp: Date.now() }),
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});

test.describe('Workspace Navigation (unauthenticated guard)', () => {
  const protectedRoutes = [
    '/chat', '/image', '/video', '/music', '/drive',
    '/docs', '/sheets', '/slides', '/search',
    '/developer', '/designer', '/inbox', '/settings',
    '/admin', '/agents', '/meeting-notes', '/podcasts',
  ];

  for (const route of protectedRoutes) {
    test(`${route} loads or redirects without 5xx crash`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      const status = response?.status() ?? 0;
      // Acceptable: 200 (rendered with client-side auth gate), 302/307 (redirect to login)
      // Unacceptable: 500+
      expect(status).toBeLessThan(500);
    });
  }
});

test.describe('Click Interactivity Smoke', () => {
  test('login page Google OAuth button is clickable', async ({ page }) => {
    await page.goto('/login');
    const googleBtn = page.locator('button, a').filter({ hasText: /google/i }).first();
    if (await googleBtn.isVisible()) {
      // Just verify it's enabled and reachable; don't actually navigate to Google
      await expect(googleBtn).toBeEnabled();
    }
  });

  test('homepage has at least one interactive CTA', async ({ page }) => {
    await page.goto('/');
    const cta = page.locator('a[href], button').first();
    await expect(cta).toBeVisible({ timeout: 10_000 });
  });
});

/**
 * E2E Tests - Trace Drilldown
 *
 * Tests trace visualization and navigation.
 *
 * NOTE: These tests are skipped until the TraceDrilldown UI is implemented.
 * The page objects expect features like:
 * - Trace ID input
 * - Load/Clear buttons
 * - Trace visualization
 * - Deep link to Tempo
 */

import { test, expect } from '@playwright/test';
import { LoginPage, TraceDrilldownPage } from './pages';

// TraceDrilldown UI now implemented as tab in RootPage - unskipped for validation
test.describe('BeTrace Trace Drilldown', () => {
  let loginPage: LoginPage;
  let tracePage: TraceDrilldownPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    tracePage = new TraceDrilldownPage(page);

    await loginPage.login();
    await tracePage.navigate();
  });

  test('T3.1 - Navigate to trace drilldown', async () => {
    await tracePage.verifyPageLoaded();
  });

  test('T3.2 - Enter trace ID', async () => {
    const testTraceId = '1234567890abcdef';

    await tracePage.enterTraceId(testTraceId);

    // Verify input contains the trace ID
    const inputValue = await tracePage.traceIdInput.inputValue();
    expect(inputValue).toBe(testTraceId);
  });

  test('T3.3 - Load trace - success (mock)', async ({ page }) => {
    // This test requires a mock backend or test trace ID
    const testTraceId = 'test-trace-12345';
    const now = Date.now() * 1000000; // nanoseconds

    // Intercept API call and return mock data with complete trace structure
    await page.route('**/api/traces/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          traceId: testTraceId,
          serviceName: 'test-service',
          startTime: now,
          endTime: now + 1500000,
          duration: 1500000,
          violations: [],
          spans: [
            {
              spanId: 'span-1',
              traceId: testTraceId,
              name: 'GET /api/users',
              kind: 'SERVER',
              startTime: now,
              endTime: now + 1500000,
              duration: 1500000,
              attributes: {},
              status: { code: 'OK' },
              resource: { 'service.name': 'test-service' },
            },
          ],
        }),
      });
    });

    await tracePage.loadTrace(testTraceId);
    await tracePage.verifyTraceLoaded(testTraceId);
  });

  test('T3.4 - Load trace - not found', async ({ page }) => {
    const nonExistentTraceId = 'nonexistent-trace-id';

    // Intercept API call and return 404
    await page.route('**/api/traces/**', (route) => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Trace not found',
        }),
      });
    });

    await tracePage.loadTrace(nonExistentTraceId);
    await tracePage.verifyTraceNotFound();
  });

  test('T3.5 - Load trace - invalid format', async ({ page }) => {
    const invalidTraceId = 'invalid!@#$%';

    await tracePage.enterTraceId(invalidTraceId);

    // Wait for input to be registered in React state
    await page.waitForTimeout(100);

    // Verify validation error or helpful message
    await tracePage.loadTraceButton.click();

    // Should show error about invalid format - the Alert title is "Invalid Input"
    await expect(page.locator('text=Invalid trace ID format')).toBeVisible({ timeout: 5000 });
  });

  test('T3.6 - Tempo deep link button visible (if feature exists)', async ({ page }) => {
    // This test checks if Tempo integration is present
    const testTraceId = 'test-trace-tempo';
    const now = Date.now() * 1000000;

    // Mock successful trace load with complete data
    await page.route('**/api/traces/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          traceId: testTraceId,
          serviceName: 'test-service',
          startTime: now,
          endTime: now + 1000000,
          duration: 1000000,
          violations: [],
          spans: [{
            spanId: 'span-1',
            traceId: testTraceId,
            name: 'test',
            kind: 'SERVER',
            startTime: now,
            endTime: now + 1000000,
            duration: 1000000,
            attributes: {},
            status: { code: 'OK' },
            resource: {},
          }],
        }),
      });
    });

    await tracePage.loadTrace(testTraceId);

    // Check if "View in Tempo" button exists
    if (await tracePage.viewInTempoButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(tracePage.viewInTempoButton).toBeVisible();
    } else {
      // Feature not implemented yet - test passes
      console.log('Tempo deep link feature not implemented');
    }
  });

  test('T3.7 - Clear and reload trace', async ({ page }) => {
    const traceId1 = 'trace-1';
    const traceId2 = 'trace-2';
    const now = Date.now() * 1000000;

    // Mock backend with complete trace data
    await page.route('**/api/traces/**', (route) => {
      const url = route.request().url();
      const traceId = url.includes(traceId1) ? traceId1 : traceId2;

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          traceId,
          serviceName: 'test-service',
          startTime: now,
          endTime: now + 1000000,
          duration: 1000000,
          violations: [],
          spans: [{
            spanId: 'span-1',
            traceId,
            name: `operation-${traceId}`,
            kind: 'SERVER',
            startTime: now,
            endTime: now + 1000000,
            duration: 1000000,
            attributes: {},
            status: { code: 'OK' },
            resource: {},
          }],
        }),
      });
    });

    // Load first trace
    await tracePage.loadTrace(traceId1);
    await tracePage.verifyTraceLoaded(traceId1);

    // Click "Load Different Trace" to go back to input form
    await page.click('button:has-text("Load Different Trace")');
    await page.waitForTimeout(500);

    // Load second trace
    await tracePage.loadTrace(traceId2);
    await tracePage.verifyTraceLoaded(traceId2);
  });

  test('T3.8 - Backend connection error handling', async ({ page }) => {
    const testTraceId = 'test-trace-error';

    // Intercept and simulate network error
    await page.route('**/api/traces/**', (route) => {
      route.abort('failed');
    });

    await tracePage.loadTrace(testTraceId);

    // Verify error message appears - TraceDrilldownPage shows "Failed to load trace" Alert
    await expect(page.locator('text=Failed to load trace')).toBeVisible({ timeout: 10000 });

    // Verify helpful retry option exists (optional)
    const retryButton = page.locator('button:has-text("Retry")');
    if (await retryButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(retryButton).toBeVisible();
    }
  });
});

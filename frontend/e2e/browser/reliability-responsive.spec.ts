import { expect, Page, test } from '@playwright/test';
import { installApiMock, mockUrl, PRIMARY_ID } from '../support/api-mock';

test('E2E-UI-006 renders bounded 429 and unavailable errors without leaking transport data', async ({ page }) => {
  await installApiMock(page, {
    createFailure: {
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Try again later.',
      retryAfterSeconds: 30,
    },
  });
  await page.goto('/urls/new');
  await page.getByLabel('Original URL').fill('https://example.org/rate-limited');
  await page.getByRole('button', { name: 'Create short URL' }).click();
  await expect(page.getByText('RATE_LIMIT_EXCEEDED', { exact: true })).toBeVisible();
  await expect(page.getByText('Try again in approximately 30 seconds.')).toBeVisible();
  await page.getByText('Technical support details').click();
  await expect(page.getByText('e2e-correlation', { exact: false })).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/stack|localhost:8080|HttpErrorResponse/i);

  await page.unroute('**/api/v1/**');
  await installApiMock(page, {
    listFailure: { status: 503, code: 'SERVICE_UNAVAILABLE', message: 'List unavailable.' },
  });
  await page.goto('/urls');
  await expect(page.getByText('SERVICE_UNAVAILABLE', { exact: true })).toBeVisible();
  await expect(page.getByText('No matching URLs')).toHaveCount(0);
});

test('E2E-UI-007 remains usable at 390, 768, 1366, and 1920 CSS pixels without page overflow', async ({ page }) => {
  await installApiMock(page, {
    initialUrls: [mockUrl({ originalUrl: `https://example.com/${'long-segment-'.repeat(35)}` })],
  });
  const errors = monitorErrors(page);
  for (const width of [390, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    for (const path of ['/dashboard', '/urls/new', '/urls', `/urls/${PRIMARY_ID}`, `/urls/${PRIMARY_ID}/analytics`]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.documentWidth, `${path} at ${width}px`).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
    }
    if (width <= 768) {
      await page.goto('/dashboard');
      await page.getByRole('button', { name: 'Menu' }).click();
      await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
});

function monitorErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

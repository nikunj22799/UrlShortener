import { APIRequestContext, APIResponse, expect, Page, test } from '@playwright/test';

interface UrlRecord {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  status: 'ACTIVE' | 'DISABLED' | 'DELETED';
  expiresAt: string | null;
  version: number;
}

interface AnalyticsSummary {
  totalClicks: number;
}

const runId = Date.now().toString(36);
const destination = 'https://example.org/e2e-destination';

test.describe('real Angular + Spring Boot + MySQL workflows', () => {
  test.skip(process.env['E2E_FULL_STACK'] !== 'true', 'Set E2E_FULL_STACK=true only when the real backend and MySQL are live.');
  test.describe.configure({ mode: 'serial' });

  let browserErrors: string[];
  let expectedConsoleStatuses: number[];

  test.beforeEach(async ({ page }) => {
    browserErrors = monitorErrors(page);
    expectedConsoleStatuses = [];
  });

  test.afterEach(() => {
    const unexpected = browserErrors.filter((message) =>
      !expectedConsoleStatuses.some((status) => message.includes(`status of ${status}`)),
    );
    expect(unexpected).toEqual([]);
  });

  test('creates in the UI and reloads the persisted MySQL record by public ID', async ({ page }) => {
    const alias = `ui-${runId}`;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/urls/new');
    await page.getByLabel('Original URL').fill(destination);
    await page.getByLabel('Custom alias').fill(alias);
    await page.getByRole('button', { name: 'Create short URL' }).click();
    await expect(page.getByRole('heading', { name: alias })).toBeVisible();
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'View details' }).click();
    await page.reload();
    await expect(page.getByText(destination, { exact: true })).toBeVisible();
  });

  test('surfaces a real custom-alias conflict safely', async ({ page, request }) => {
    expectedConsoleStatuses = [409];
    const alias = `conflict-${runId}`;
    const original = await createUrl(request, alias);
    await page.goto('/urls/new');
    await page.getByLabel('Original URL').fill('https://example.org/second-destination');
    await page.getByLabel('Custom alias').fill(alias);
    await page.getByRole('button', { name: 'Create short URL' }).click();
    await expect(page.getByText('ALIAS_CONFLICT', { exact: true })).toBeVisible();
    await expect(page.getByText('That alias is already reserved.')).toBeVisible();
    const originalResponse = await request.get(`/api/v1/urls/${original.id}`);
    expect((await originalResponse.json() as UrlRecord).originalUrl).toBe(destination);
  });

  test('returns a real 302 Location and records best-effort analytics', async ({ page, request }) => {
    const alias = `redirect-${runId}`;
    const created = await createUrl(request, alias);
    const redirect = await request.get(`/r/${alias}`, {
      maxRedirects: 0,
      headers: { Referer: 'https://referrer.example/article', 'User-Agent': 'Prompt7-E2E Chrome' },
    });
    expect(redirect.status()).toBe(302);
    expect(redirect.headers()['location']).toBe(destination);
    expect(redirect.headers()['cache-control']).toContain('no-store');

    await expect.poll(async () => {
      const response = await request.get(`/api/v1/urls/${created.id}/analytics/summary`);
      return (await response.json() as AnalyticsSummary).totalClicks;
    }, { timeout: 10_000 }).toBeGreaterThanOrEqual(1);

    await page.goto(`/urls/${created.id}/analytics`);
    await expect(page.locator('.metric-value').first()).toHaveText('1');
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    await expect(page.getByText('referrer.example', { exact: true })).toBeVisible();
  });

  test('disables and re-enables a persisted URL using current ETags', async ({ page, request }) => {
    const alias = `lifecycle-${runId}`;
    const created = await createUrl(request, alias);
    await page.goto(`/urls/${created.id}`);
    await page.getByRole('button', { name: 'Disable', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Disable URL' }).click();
    await expect(page.getByText('DISABLED', { exact: true })).toBeVisible();
    expect((await request.get(`/r/${alias}`, { maxRedirects: 0 })).status()).toBe(404);
    await page.getByRole('button', { name: 'Enable', exact: true }).click();
    await expect(page.getByText('ACTIVE', { exact: true })).toBeVisible();
    expect((await request.get(`/r/${alias}`, { maxRedirects: 0 })).status()).toBe(302);
  });

  test('soft-deletes a URL and makes the redirect permanently gone', async ({ page, request }) => {
    const alias = `delete-${runId}`;
    const created = await createUrl(request, alias);
    await page.goto(`/urls/${created.id}`);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete URL' }).click();
    await expect(page).toHaveURL(/\/urls(?:\?.*)?$/);
    const redirect = await request.get(`/r/${alias}`, { maxRedirects: 0 });
    expect(redirect.status()).toBe(410);
    const normalList = await request.get(`/api/v1/urls?search=${alias}`);
    const normalPage = await normalList.json() as { items: readonly UrlRecord[] };
    expect(normalPage.items).toEqual([]);
  });

  test('enforces expiration with bounded polling rather than a fixed sleep', async ({ request }) => {
    const alias = `expires-${runId}`;
    await createUrl(request, alias, new Date(Date.now() + 3_000).toISOString());
    const initial = await request.head(`/r/${alias}`, { maxRedirects: 0 });
    expect(initial.status()).toBe(302);
    await expect.poll(
      async () => (await request.head(`/r/${alias}`, { maxRedirects: 0 })).status(),
      { timeout: 12_000, intervals: [250, 500, 1_000] },
    ).toBe(410);
  });

  test('paginates, searches, filters, and sorts against the real repository', async ({ page, request }) => {
    const prefix = `page-${runId}`;
    for (let index = 0; index < 11; index += 1) {
      await createUrl(request, `${prefix}-${index.toString().padStart(2, '0')}`);
    }
    await page.goto(`/urls?search=${prefix}&status=ACTIVE&sort=shortCode&direction=asc&size=10`);
    await expect(page.getByText('11 matching records')).toBeVisible();
    await expect(page.getByText('Page 1 of 2').first()).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(10);
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page).toHaveURL(/page=1/);
    await expect(page.locator('tbody tr')).toHaveCount(1);
  });

  test('rejects a stale UI mutation after an out-of-band version change', async ({ page, request }) => {
    expectedConsoleStatuses = [409];
    const created = await createUrl(request, `stale-${runId}`);
    await page.goto(`/urls/${created.id}`);
    const changed = await request.patch(`/api/v1/urls/${created.id}`, {
      headers: { 'If-Match': `"${created.version}"` },
      data: { expiresAt: new Date(Date.now() + 86_400_000).toISOString() },
    });
    expect(changed.ok()).toBe(true);
    await page.getByRole('button', { name: 'Disable', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Disable URL' }).click();
    await expect(page.getByText('OPTIMISTIC_LOCK_CONFLICT', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reload latest record' })).toBeVisible();
  });

  test('keeps HEAD analytics-neutral while GET increments the real timeline', async ({ request }) => {
    const alias = `head-${runId}`;
    const created = await createUrl(request, alias);
    const before = await analyticsSummary(request, created.id);
    expect((await request.head(`/r/${alias}`, { maxRedirects: 0 })).status()).toBe(302);
    const afterHead = await analyticsSummary(request, created.id);
    expect(afterHead.totalClicks).toBe(before.totalClicks);
    expect((await request.get(`/r/${alias}`, { maxRedirects: 0 })).status()).toBe(302);
    await expect.poll(async () => (await analyticsSummary(request, created.id)).totalClicks, { timeout: 10_000 })
      .toBe(before.totalClicks + 1);
  });
});

async function createUrl(
  request: APIRequestContext,
  customAlias: string,
  expiresAt?: string,
): Promise<UrlRecord> {
  const response = await request.post('/api/v1/urls', {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    data: { originalUrl: destination, customAlias, ...(expiresAt ? { expiresAt } : {}) },
  });
  expectResponse(response, 201);
  return response.json() as Promise<UrlRecord>;
}

async function analyticsSummary(request: APIRequestContext, id: string): Promise<AnalyticsSummary> {
  const response = await request.get(`/api/v1/urls/${id}/analytics/summary`);
  expectResponse(response, 200);
  return response.json() as Promise<AnalyticsSummary>;
}

function expectResponse(response: APIResponse, status: number): void {
  expect(response.status(), response.url()).toBe(status);
}

function monitorErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const location = message.location().url;
      errors.push(`console: ${message.text()}${location ? ` (${location})` : ''}`);
    }
  });
  return errors;
}

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('E2E-UI-008 presents reviewer evidence, readiness boundaries, and an honest empty portfolio', async ({ page }) => {
  await page.route('**/actuator/health', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'UP' }) }),
  );
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/engineering-review');
  await expect(page.getByRole('heading', { name: 'Engineering Review', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Implemented and packaged surfaces' })).toBeVisible();
  await expect(page.getByText('19 skipped', { exact: false })).toBeVisible();
  await expect(page.getByText('PENDING', { exact: true }).first()).toBeVisible();

  await page.goto('/production-readiness');
  await expect(page.getByText('READY_FOR_DEMO', { exact: true })).toBeVisible();
  await expect(page.getByText('NOT_PRODUCTION_READY', { exact: true })).toBeVisible();
  await expect(page.getByText('UP', { exact: true })).toBeVisible();

  await page.goto('/production-applications');
  await expect(page.getByText('REQUIRES_HUMAN_INPUT', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No approved portfolio entries' })).toBeVisible();

  for (const path of ['/engineering-review', '/production-readiness', '/production-applications']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const serious = (await new AxeBuilder({ page }).include('main').analyze()).violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    );
    expect(serious, `${path}: ${serious.map((violation) => violation.id).join(', ')}`).toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} mobile document overflow`).toBeLessThanOrEqual(1);
  }
});

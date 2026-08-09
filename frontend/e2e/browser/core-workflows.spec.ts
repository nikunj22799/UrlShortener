import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { installApiMock, PRIMARY_ID } from '../support/api-mock';

test.beforeEach(async ({ page }) => {
  await installApiMock(page);
});

test('E2E-UI-001 creates a custom alias and opens its persisted details at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/urls/new');
  await page.getByLabel('Original URL').fill('https://example.org/releases/2026');
  await page.getByLabel('Custom alias').fill('august-release');
  await page.getByRole('button', { name: 'Create short URL' }).click();
  await expect(page.getByRole('heading', { name: 'august-release' })).toBeVisible();
  await page.getByRole('link', { name: 'View details' }).click();
  await expect(page.getByRole('heading', { name: 'URL Details' })).toBeVisible();
  await expect(page.getByText('https://example.org/releases/2026', { exact: true })).toBeVisible();
});

test('E2E-UI-002 filters management and operates the confirmation dialog by keyboard', async ({ page }) => {
  await page.goto('/urls');
  await page.getByLabel('Search').fill('release');
  await page.getByLabel('Status').selectOption('ACTIVE');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page).toHaveURL(/search=release/);
  await expect(page.getByText('release-notes', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Disable', exact: true }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Disable short URL?' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Disable URL' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Disable', exact: true })).toBeFocused();
});

test('E2E-UI-003 renders analytics and blocks a reversed client-side range', async ({ page }) => {
  await page.goto(`/urls/${PRIMARY_ID}/analytics`);
  await expect(page.getByText('DIRECT_OR_UNKNOWN', { exact: true })).toBeVisible();
  await expect(page.getByText('DESKTOP', { exact: true })).toBeVisible();
  await page.getByLabel(/From/).fill('2030-01-02T00:00');
  await page.getByLabel(/To/).fill('2030-01-01T00:00');
  await page.getByRole('button', { name: 'Apply range' }).click();
  await expect(page.getByRole('alert')).toHaveText('From must be earlier than To.');
});

test('E2E-UI-004 has no serious axe violations on representative data pages', async ({ page }) => {
  for (const path of ['/dashboard', '/urls/new', '/urls', `/urls/${PRIMARY_ID}`, `/urls/${PRIMARY_ID}/analytics`]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).include('main').analyze();
    const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
    expect(serious, `${path}: ${serious.map((violation) => violation.id).join(', ')}`).toEqual([]);
  }
});

test('E2E-UI-005 exposes only the implemented navigation destinations', async ({ page }) => {
  await page.goto('/dashboard');
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(navigation.getByRole('link')).toHaveText([
    'Dashboard',
    'Create URL',
    'URL Management',
    'Analytics',
    'Engineering Review',
    'Readiness',
    'Applications',
  ]);
  await expect(navigation.getByRole('link', { name: /login|users|operations/i })).toHaveCount(0);
  await page.goto('/deferred-feature');
  await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible();
});

import { expect, gateSeen, RECORD_GATE, test } from './fixtures';

test.use({ launchOptions: { args: ['--disable-gpu', '--disable-webgl', '--disable-webgl2'] } });

test('without WebGL, the HTML site shows, with no entry gate', async ({ page }) => {
  await page.addInitScript(RECORD_GATE);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Vardaan' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await gateSeen(page)).toBe(false);
});

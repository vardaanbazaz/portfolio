import { expect, test } from './fixtures';

test.use({ launchOptions: { args: ['--disable-gpu', '--disable-webgl', '--disable-webgl2'] } });

test('without WebGL, the HTML site shows', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Vardaan' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});

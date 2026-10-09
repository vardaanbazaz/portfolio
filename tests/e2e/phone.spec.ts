import type { Page } from '@playwright/test';
import { PAGE_IDS } from '../../src/pages/contract';
import { PAGE_PATHS } from '../../src/routes';
import { SECTION_IDS } from '../../src/sections/contract';
import { expect, scrollToSection, test, waitForScene } from './fixtures';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

/** Neither the window nor the page view (its own scroll container) scrolls sideways. */
async function expectNoSidewaysScroll(page: Page, where: string) {
  const widths = await page.evaluate(() =>
    [document.documentElement, ...document.querySelectorAll<HTMLElement>('main.page')].map((el) => ({
      scroll: el.scrollWidth,
      client: el.clientWidth,
    })),
  );
  for (const { scroll, client } of widths) expect(scroll, `sideways scroll at ${where}`).toBeLessThanOrEqual(client);
}

test('at 390 px, no section or page scrolls sideways, and markers are at least 44 px', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await expectNoSidewaysScroll(page, 'landing');
  for (const id of SECTION_IDS) {
    await scrollToSection(page, id);
    await expectNoSidewaysScroll(page, id);
    for (const marker of await page.locator('button.marker').all()) {
      if (!(await marker.isVisible())) continue;
      const box = (await marker.boundingBox())!;
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    }
  }
  // The menu folds behind its toggle; open, it still fits.
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.locator('#menu-list')).toBeVisible();
  await expectNoSidewaysScroll(page, 'menu open');

  for (const id of PAGE_IDS) {
    await page.goto(PAGE_PATHS[id]);
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoSidewaysScroll(page, PAGE_PATHS[id]);
  }
});

test.describe('HTML site', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('at 390 px, the HTML site and its pages do not scroll sideways', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Vardaan' })).toBeVisible();
    await expectNoSidewaysScroll(page, 'fallback home');
    for (const id of PAGE_IDS) {
      await page.goto(PAGE_PATHS[id]);
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
      await expectNoSidewaysScroll(page, `fallback ${PAGE_PATHS[id]}`);
    }
  });
});

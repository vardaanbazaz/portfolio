import type { Page } from '@playwright/test';
import { PAGE_PATHS } from '../../src/routes';
import { expect, marker, scrollToSection, test, waitForScene } from './fixtures';

/** Opening a page focuses its heading for screen readers, with no ring; the visitor's own Tab focus keeps one. */

const outline = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const style = getComputedStyle(el);
    return { tag: el.tagName.toLowerCase(), style: style.outlineStyle, width: style.outlineWidth };
  });

/** The heading has focus and draws no ring; then Tab moves to a link or button, which draws one. */
async function expectQuietHeadingThenRing(page: Page) {
  await expect(page.locator('main.page h1')).toBeFocused();
  expect(await outline(page)).toMatchObject({ tag: 'h1', style: 'none' });
  await page.keyboard.press('Tab');
  const tabbed = await outline(page);
  expect(['a', 'button']).toContain(tabbed.tag);
  expect(tabbed.style).toBe('solid');
  expect(tabbed.width).toBe('2px');
}

test('a page opened from its marker by the keyboard focuses its heading without a ring', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page, { worlds: false });
  await scrollToSection(page, 'about');
  // The marker is hidden until it has been placed, and a hidden button can't take focus.
  await expect(marker(page, 'About')).toBeVisible();
  await marker(page, 'About').focus();
  await marker(page, 'About').press('Enter');
  await expect(page.locator('main.page article.about')).toBeVisible();
  await expectQuietHeadingThenRing(page);
});

for (const path of [PAGE_PATHS.about, PAGE_PATHS.publications, PAGE_PATHS.contact]) {
  test(`${path} opened by its URL focuses its heading without a ring`, async ({ page }) => {
    await page.goto(path);
    await expectQuietHeadingThenRing(page);
  });
}

test.describe('on the HTML site', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('Tab focus on a link still draws its ring', async ({ page }) => {
    await page.goto(PAGE_PATHS.contact);
    await expect(page.locator('main.page-static h1')).toBeVisible();
    await page.keyboard.press('Tab');
    const tabbed = await outline(page);
    expect(['a', 'button']).toContain(tabbed.tag);
    expect(tabbed.style).toBe('solid');
  });
});

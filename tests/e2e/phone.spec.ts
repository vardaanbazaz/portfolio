import type { Page } from '@playwright/test';
import { LANDING } from '../../src/content/scene';
import { VERSE } from '../../src/content/verse';
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

/** The element's box stays inside the viewport, and each of its words sits on one line: breaks only at spaces. */
async function expectWrapsAtSpaces(page: Page, selector: string) {
  const { left, right, width, brokenWords } = await page.locator(selector).evaluate((el) => {
    const text = el.firstChild!;
    const words: [number, number][] = [];
    for (const match of text.textContent!.matchAll(/\S+/g)) words.push([match.index, match.index + match[0].length]);
    const brokenWords = words.filter(([start, end]) => {
      const range = document.createRange();
      range.setStart(text, start);
      range.setEnd(text, end);
      return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size !== 1;
    }).length;
    const box = el.getBoundingClientRect();
    return { left: box.left, right: box.right, width: window.innerWidth, brokenWords };
  });
  expect(left).toBeGreaterThanOrEqual(0);
  expect(right).toBeLessThanOrEqual(width);
  expect(brokenWords, `words broken across lines in ${selector}`).toBe(0);
}

test('at 390 px, the landing verse line wraps at spaces, and the landing text clears the scroll cue', async ({ page }) => {
  const fonts: string[] = [];
  page.on('request', (request) => void (request.resourceType() === 'font' && fonts.push(request.url())));
  await page.goto('/');
  await waitForScene(page);
  const line = page.locator('.landing-line');
  await expect(line).toBeVisible();
  await expect(line).toHaveAttribute('lang', 'sa');
  await expect(line).toHaveText(LANDING.line);
  await expect(page.locator('.landing-gloss')).toHaveText(`${LANDING.gloss.text} ${LANDING.gloss.source}`);
  await expectWrapsAtSpaces(page, '.landing-line');

  const textBottom = (await page.locator('.landing-subline').boundingBox())!;
  const cue = (await page.locator('.landing-cue').boundingBox())!;
  expect(textBottom.y + textBottom.height, 'landing text runs into the scroll cue').toBeLessThanOrEqual(cue.y);
  expect(fonts, 'font requests').toEqual([]);
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

  test('at 390 px, the HTML home and About show the verse, marked Sanskrit, wrapping at spaces', async ({ page }) => {
    await page.goto('/');
    const line = page.locator('main p[lang="sa"]');
    await expect(line).toHaveText(LANDING.line);
    await expect(page.locator('main .verse-gloss')).toHaveText(`${LANDING.gloss.text} ${LANDING.gloss.source}`);
    await expectWrapsAtSpaces(page, 'main p[lang="sa"]');

    await page.goto(PAGE_PATHS.about);
    const quote = page.getByRole('main').locator('blockquote[lang="sa"]');
    await expect(quote).toHaveText(VERSE.lines.join(''));
    await expect(quote.locator('br')).toHaveCount(1);
    await expect(page.getByRole('main').locator('figcaption')).toHaveText(`${VERSE.translation.join(' ')} ${VERSE.source}`);
    // Under the heading, above Education.
    const order = await page
      .getByRole('main')
      .locator('h1, figure, h2')
      .evaluateAll((els) => els.map((el) => el.tagName));
    expect(order.slice(0, 3)).toEqual(['H1', 'FIGURE', 'H2']);
    await expect(page.getByRole('main').getByRole('heading', { level: 2 }).first()).toHaveText('Education');
  });
});

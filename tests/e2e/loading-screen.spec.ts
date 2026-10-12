import type { Page } from '@playwright/test';
import { PAGE_PATHS } from '../../src/routes';
import { LOADING_SCREEN_LIMIT_SECONDS } from '../../src/scene/tuning';
import { chunkPattern, expect, holdChunks, loadingScreen, marker, PAGE_CHUNKS, PANEL_CHUNKS, scrollToSection, test } from './fixtures';

/** Backdrop images: the landing's base and ground layers (`BACKDROPS` in `src/environment/backdrops.ts`, which
 *  imports media files Playwright can't load). */
const IMAGES = ['landing-base', 'landing-ground'];

/** Every step the scene site counts: its code, its first frame, each backdrop image, and each page and panel chunk. */
const TOTAL_STEPS = 2 + IMAGES.length + PAGE_CHUNKS.length + PANEL_CHUNKS.length;

/** The background fetch takes the chunks in turn and the panels come last, so holding the last one back leaves every
 *  other step done. */
const LAST_CHUNK = 'CitationPanel';

/** Records, in page time, when the scene's first frame reached the loading screen and when the screen lifted. */
const RECORD_LOADING = () => {
  const w = window as unknown as { loading: { drawnAt?: number; liftedAt?: number } };
  w.loading = {};
  let seen = false;
  new MutationObserver(() => {
    const el = document.getElementById('loading-screen');
    if (el) seen = true;
    if (el && 'drawn' in el.dataset) w.loading.drawnAt ??= performance.now();
    if (seen && (!el || el.classList.contains('loading-screen-out'))) w.loading.liftedAt ??= performance.now();
  }).observe(document, { childList: true, subtree: true, attributes: true });
};

const recorded = (page: Page) =>
  page.evaluate(() => (window as unknown as { loading: { drawnAt: number; liftedAt: number } }).loading);

/** Holds back animation frames until the test releases them, so the scene can't draw its first frame and the limit
 *  never starts: the loading screen stays up for as long as the test needs. */
const HOLD_FRAMES = () => {
  const w = window as unknown as { releaseFrames: () => void };
  const original = window.requestAnimationFrame.bind(window);
  const held: FrameRequestCallback[] = [];
  window.requestAnimationFrame = (callback) => {
    held.push(callback);
    return 0;
  };
  w.releaseFrames = () => {
    window.requestAnimationFrame = original;
    for (const callback of held.splice(0)) original(callback);
  };
};

const releaseFrames = (page: Page) => page.evaluate(() => (window as unknown as { releaseFrames: () => void }).releaseFrames());

/** The scene has drawn and every chunk but the held one has arrived. */
async function expectAllButOne(page: Page) {
  await expect(loadingScreen(page)).toHaveAttribute('data-drawn', '', { timeout: 20_000 });
  await expect(loadingScreen(page)).toHaveAttribute('data-done', String(TOTAL_STEPS - 1), { timeout: 20_000 });
  await expect(loadingScreen(page)).toHaveAttribute('data-total', String(TOTAL_STEPS));
}

test('before any script has run, the loading screen shows the name, an empty bar and a Loading status, over an inert page', async ({
  page,
}) => {
  // The site's entry script is never answered, so none of the site's code runs.
  let entryRequested = false;
  await page.route(chunkPattern('index'), () => {
    entryRequested = true;
  });
  // 'commit': the document's load events wait on its module scripts, so they never come.
  await page.goto('/', { waitUntil: 'commit' });
  await expect.poll(() => entryRequested).toBe(true);

  await expect(loadingScreen(page)).toBeVisible();
  await expect(loadingScreen(page).getByText('Vardaan', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Loading');
  await expect(loadingScreen(page).locator('.loading-screen-bar')).toBeVisible();
  await expect(loadingScreen(page).locator('.loading-screen-fill')).toHaveCSS('transform', 'matrix(0, 0, 0, 1, 0, 0)');
  await expect(loadingScreen(page)).not.toHaveAttribute('data-done');
  await expect(page.locator('#root')).toHaveAttribute('inert');
  await expect(page.locator('#root')).toBeEmpty();
  await expect(page.locator('html')).toHaveClass('booting');
});

test.describe('with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  test('the loading screen shows the name and the no-JavaScript message, with no bar and no Loading status', async ({ page }) => {
    await page.goto('/');
    await expect(loadingScreen(page).getByText('Vardaan', { exact: true })).toBeVisible();
    // By CSS: Playwright's text search skips whatever is inside <noscript>.
    const message = loadingScreen(page).locator('noscript p');
    await expect(message).toBeVisible();
    await expect(message).toHaveText('This site needs JavaScript. Turn it on and reload.');
    await expect(loadingScreen(page).locator('.loading-screen-bar')).toBeHidden();
    await expect(loadingScreen(page).locator('.loading-screen-status')).toBeHidden();
    await expect(page.getByRole('status')).toHaveCount(0);
  });
});

test('the loading screen stays while a chunk is held back, and lifts when it arrives', async ({ page }) => {
  await page.addInitScript(RECORD_LOADING);
  // The first frame is held too, so the limit can't start while the other chunks arrive.
  await page.addInitScript(HOLD_FRAMES);
  const held = await holdChunks(page, [LAST_CHUNK]);
  await page.goto('/');
  // Every step but the first frame and the held chunk is done.
  await expect(loadingScreen(page)).toHaveAttribute('data-done', String(TOTAL_STEPS - 2), { timeout: 20_000 });
  await expect(loadingScreen(page)).not.toHaveAttribute('data-drawn');

  // Now the limit starts, with only the held chunk left.
  await releaseFrames(page);
  await expectAllButOne(page);
  await expect(loadingScreen(page)).toBeVisible();
  await expect(page.locator('#root')).toHaveAttribute('inert');

  await held.release();
  await expect(loadingScreen(page)).toHaveCount(0);
  await expect(page.locator('#root')).not.toHaveAttribute('inert');
  await expect(page.locator('html')).not.toHaveClass('booting');
  // It lifted on the chunk's arrival, before the limit could have lifted it.
  const { drawnAt, liftedAt } = await recorded(page);
  expect(liftedAt - drawnAt).toBeLessThan(LOADING_SCREEN_LIMIT_SECONDS * 1000);
});

/** Records, in page time, when each image's decode() resolved, by its URL. */
const RECORD_DECODES = () => {
  const w = window as unknown as { decodes: { src: string; at: number }[] };
  w.decodes = [];
  const decode = HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode = function (this: HTMLImageElement) {
    return decode.call(this).then(() => {
      w.decodes.push({ src: this.src, at: performance.now() });
    });
  };
};

test('the loading screen waits for both landing images to decode', async ({ page }) => {
  await page.addInitScript(RECORD_LOADING);
  await page.addInitScript(RECORD_DECODES);
  // The first frame is held too, so the limit can't start while the image is held.
  await page.addInitScript(HOLD_FRAMES);
  const held: import('@playwright/test').Route[] = [];
  await page.route(/landing-ground-[\w-]+\.webp(\?.*)?$/, (route) => {
    held.push(route);
  });
  await page.goto('/');
  // Every step but the first frame and the held image is done.
  await expect(loadingScreen(page)).toHaveAttribute('data-done', String(TOTAL_STEPS - 2), { timeout: 20_000 });
  await releaseFrames(page);
  await expectAllButOne(page);
  await expect(loadingScreen(page)).toBeVisible();

  await expect.poll(() => held.length).toBeGreaterThan(0);
  for (const route of held.splice(0)) await route.continue();
  await page.unroute(/landing-ground-[\w-]+\.webp(\?.*)?$/);
  await expect(loadingScreen(page)).toHaveCount(0);
  const { liftedAt } = await recorded(page);
  const decodes = await page.evaluate(() => (window as unknown as { decodes: { src: string; at: number }[] }).decodes);
  for (const name of IMAGES) {
    const first = decodes.find(({ src }) => new URL(src).pathname.includes(`/${name}-`));
    expect(first, `${name} decoded`).toBeDefined();
    expect(first!.at, `${name} decoded before the screen lifted`).toBeLessThanOrEqual(liftedAt);
  }
  // Both are in the page, decoded, behind the canvas.
  const images = page.locator('.backdrop[data-zone="landing"] img');
  await expect(images).toHaveCount(2);
  for (let i = 0; i < 2; i++) await expect(images.nth(i)).toHaveJSProperty('complete', true);
});

test('the loading screen lifts at the limit if a chunk never arrives, and that panel shows its own loading line', async ({ page }) => {
  // Never answered: the request stays open for the rest of the test.
  await page.route(chunkPattern(LAST_CHUNK), () => {});
  await page.goto('/');
  await expectAllButOne(page);

  // The chunk is never answered, so only the limit can lift it.
  await expect(loadingScreen(page)).toHaveCount(0, { timeout: LOADING_SCREEN_LIMIT_SECONDS * 1000 + 10_000 });

  await scrollToSection(page, 'publications');
  await marker(page, 'Web Page Linker').click();
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText('Loading');
});

test('while the loading screen is up, nothing behind it can be clicked, focused or scrolled', async ({ page }) => {
  await page.addInitScript(HOLD_FRAMES);
  await page.goto('/');
  // Every step but the first frame is done.
  await expect(loadingScreen(page)).toHaveAttribute('data-done', String(TOTAL_STEPS - 1), { timeout: 20_000 });
  await expect(loadingScreen(page)).not.toHaveAttribute('data-drawn');

  const mute = page.getByRole('button', { name: 'Mute' });
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  const box = (await mute.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(mute).toHaveAttribute('aria-pressed', 'false');

  for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.getElementById('root')!.contains(document.activeElement))).toBe(false);

  await page.mouse.wheel(0, 2000);
  await page.keyboard.press('PageDown');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(loadingScreen(page)).toBeVisible();

  // Once the scene draws, the screen lifts and the same press reaches the toggle, so the press above really aimed at it.
  await releaseFrames(page);
  await expect(loadingScreen(page)).toHaveCount(0);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
});

test('a direct page link lifts the loading screen once that page is ready, without waiting for the other chunks', async ({ page }) => {
  const held = await holdChunks(page, [LAST_CHUNK]);
  await page.goto(PAGE_PATHS.attrition);
  const heading = page.getByRole('main').getByRole('heading', { level: 1 });
  await expect(heading).toHaveText('Employee Attrition Analysis', { timeout: 20_000 });
  await expect(loadingScreen(page)).toHaveCount(0);
  // The page took focus once the screen had cleared the way.
  await expect(heading).toBeFocused();
  await held.release();
});

test.describe('the HTML fallback', () => {
  test('with reduced motion, the loading screen is gone once the fallback shows', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Vardaan' })).toBeVisible();
    await expect(loadingScreen(page)).toHaveCount(0);
    await expect(page.locator('#root')).not.toHaveAttribute('inert');
    await expect(page.locator('html')).not.toHaveClass('booting');
    await context.close();
  });

  test('if the scene code fails to load, the fallback shows and the loading screen goes', async ({ page }) => {
    await page.route(chunkPattern('sceneMain'), (route) => route.abort());
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Vardaan' })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(loadingScreen(page)).toHaveCount(0);
    await expect(page.locator('#root')).not.toHaveAttribute('inert');
  });
});

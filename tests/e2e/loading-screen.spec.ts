import type { Page } from '@playwright/test';
import { PAGE_PATHS } from '../../src/routes';
import {
  GATE_ENERGY_MAX_SCALE,
  GATE_ENTER_WIDTH_PX,
  GATE_FADE_IN_SECONDS,
  GATE_TARGET_MIN_PX,
  LOADING_SCREEN_LIMIT_SECONDS,
} from '../../src/scene/tuning';
import {
  audioContexts,
  audioContextStates,
  chunkPattern,
  COUNT_AUDIO_CONTEXTS,
  enterButton,
  expect,
  gate,
  gateSeen,
  holdChunks,
  loadingScreen,
  marker,
  PAGE_CHUNKS,
  PANEL_CHUNKS,
  passGate,
  quietButton,
  RECORD_GATE,
  scrollToSection,
  test,
} from './fixtures';

/** Backdrop images: the landing's base and ground layers (`BACKDROPS` in `src/environment/backdrops.ts`, which
 *  imports media files Playwright can't load). */
const IMAGES = ['landing-base', 'landing-ground'];

/** Every step the scene site counts: its code, its first frame, each backdrop image, and each page and panel chunk. */
const TOTAL_STEPS = 2 + IMAGES.length + PAGE_CHUNKS.length + PANEL_CHUNKS.length;

/** The background fetch takes the chunks in turn and the panels come last, so holding the last one back leaves every
 *  other step done. */
const LAST_CHUNK = 'CitationPanel';

/** Below this the Enter button is visibly at rest: its width differs from rest by under a quarter px. */
const VISUAL_REST = 0.25 / (GATE_ENTER_WIDTH_PX * GATE_ENERGY_MAX_SCALE);

/** Records, in page time, every energy the Enter button draws, with its inline transform and border opacity. */
const RECORD_ENERGY = () => {
  const button = document.querySelector<HTMLElement>('.loading-gate-enter')!;
  const w = window as unknown as { energyLog: { energy: number; at: number; transform: string; border: string }[] };
  w.energyLog = [];
  new MutationObserver(() => {
    w.energyLog.push({
      energy: Number(button.dataset.energy),
      at: performance.now(),
      transform: button.style.transform,
      border: button.style.getPropertyValue('--gate-energy-border'),
    });
  }).observe(button, { attributeFilter: ['data-energy'] });
};
type EnergyLog = { energy: number; at: number; transform: string; border: string }[];
const energyLog = (page: Page) => page.evaluate(() => (window as unknown as { energyLog: EnergyLog }).energyLog);
const clearEnergyLog = (page: Page) => page.evaluate(() => void ((window as unknown as { energyLog: EnergyLog }).energyLog = []));
const peak = (log: EnergyLog) => Math.max(0, ...log.map((e) => e.energy));
/** The energy has settled back to 0, so the loop has stopped. */
const atRest = (page: Page) => expect(enterButton(page)).toHaveAttribute('data-energy', '0');

/** Records, in page time, when the scene's first frame reached the loading screen and when the entry gate took the
 *  bar's place (where the screen used to lift by itself). */
const RECORD_LOADING = () => {
  const w = window as unknown as { loading: { drawnAt?: number; gateAt?: number } };
  w.loading = {};
  new MutationObserver(() => {
    const el = document.getElementById('loading-screen');
    if (el && 'drawn' in el.dataset) w.loading.drawnAt ??= performance.now();
    if (el && 'gate' in el.dataset) w.loading.gateAt ??= performance.now();
  }).observe(document, { childList: true, subtree: true, attributes: true });
};

const recorded = (page: Page) =>
  page.evaluate(() => (window as unknown as { loading: { drawnAt: number; gateAt: number } }).loading);

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

test('the entry gate appears only once loading is done: not while a chunk is held back, but when it arrives', async ({ page }) => {
  await page.addInitScript(RECORD_LOADING);
  // The first frame is held too, so the limit can't start while the other chunks arrive.
  await page.addInitScript(HOLD_FRAMES);
  const held = await holdChunks(page, [LAST_CHUNK]);
  await page.goto('/');
  // Every step but the first frame and the held chunk is done.
  await expect(loadingScreen(page)).toHaveAttribute('data-done', String(TOTAL_STEPS - 2), { timeout: 20_000 });
  await expect(loadingScreen(page)).not.toHaveAttribute('data-drawn');
  await expect(gate(page)).toHaveCount(0);

  // Now the limit starts, with only the held chunk left.
  await releaseFrames(page);
  await expectAllButOne(page);
  await expect(loadingScreen(page)).toBeVisible();
  await expect(gate(page)).toHaveCount(0);
  await expect(loadingScreen(page).locator('.loading-screen-bar')).toBeVisible();
  await expect(page.locator('#root')).toHaveAttribute('inert');

  // The chunk's arrival brings the gate, not the site: the screen stays, locked, until the visitor presses.
  await held.release();
  await expect(gate(page)).toBeVisible();
  await expect(loadingScreen(page).locator('.loading-screen-bar')).toBeHidden();
  await expect(page.locator('#root')).toHaveAttribute('inert');
  await expect(page.locator('html')).toHaveClass('booting');
  // It came on the chunk's arrival, before the limit could have brought it.
  const { drawnAt, gateAt } = await recorded(page);
  expect(gateAt - drawnAt).toBeLessThan(LOADING_SCREEN_LIMIT_SECONDS * 1000);

  await passGate(page);
  await expect(page.locator('#root')).not.toHaveAttribute('inert');
  await expect(page.locator('html')).not.toHaveClass('booting');
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
  await expect(gate(page)).toBeVisible();
  const { gateAt } = await recorded(page);
  const decodes = await page.evaluate(() => (window as unknown as { decodes: { src: string; at: number }[] }).decodes);
  for (const name of IMAGES) {
    const first = decodes.find(({ src }) => new URL(src).pathname.includes(`/${name}-`));
    expect(first, `${name} decoded`).toBeDefined();
    expect(first!.at, `${name} decoded before the gate appeared`).toBeLessThanOrEqual(gateAt);
  }
  // Both are in the page, decoded, behind the canvas.
  const images = page.locator('.backdrop[data-zone="landing"] img.backdrop-image');
  await expect(images).toHaveCount(2);
  for (let i = 0; i < 2; i++) await expect(images.nth(i)).toHaveJSProperty('complete', true);
});

test('the entry gate appears at the limit if a chunk never arrives, and that panel shows its own loading line', async ({ page }) => {
  // Never answered: the request stays open for the rest of the test.
  await page.route(chunkPattern(LAST_CHUNK), () => {});
  await page.goto('/');
  await expectAllButOne(page);

  // The chunk is never answered, so only the limit can bring the gate.
  await expect(gate(page)).toBeVisible({ timeout: LOADING_SCREEN_LIMIT_SECONDS * 1000 + 10_000 });
  await passGate(page);

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

  // Once the scene draws and the visitor enters with sound, the screen lifts and the same press reaches the toggle,
  // so the press above really aimed at it.
  await releaseFrames(page);
  await passGate(page, { sound: true });
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
});

test('a direct page link lifts the loading screen once that page is ready, without waiting for the other chunks or a gate', async ({
  page,
}) => {
  await page.addInitScript(RECORD_GATE);
  const held = await holdChunks(page, [LAST_CHUNK]);
  await page.goto(PAGE_PATHS.attrition);
  const heading = page.getByRole('main').getByRole('heading', { level: 1 });
  await expect(heading).toHaveText('Employee Attrition Analysis', { timeout: 20_000 });
  await expect(loadingScreen(page)).toHaveCount(0);
  // The page took focus once the screen had cleared the way.
  await expect(heading).toBeFocused();
  await held.release();
  expect(await gateSeen(page)).toBe(false);
});

test.describe('the HTML fallback', () => {
  test('with reduced motion, the loading screen is gone once the fallback shows, with no gate', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.addInitScript(RECORD_GATE);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Vardaan' })).toBeVisible();
    await expect(loadingScreen(page)).toHaveCount(0);
    await expect(page.locator('#root')).not.toHaveAttribute('inert');
    await expect(page.locator('html')).not.toHaveClass('booting');
    expect(await gateSeen(page)).toBe(false);
    await context.close();
  });

  test('if the scene code fails to load, the fallback shows and the loading screen goes, with no gate', async ({ page }) => {
    await page.addInitScript(RECORD_GATE);
    await page.route(chunkPattern('sceneMain'), (route) => route.abort());
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Vardaan' })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(loadingScreen(page)).toHaveCount(0);
    await expect(page.locator('#root')).not.toHaveAttribute('inert');
    expect(await gateSeen(page)).toBe(false);
  });
});

test.describe('the entry gate', () => {
  test('takes the bar\'s place without moving the name, and fits at 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/');
    const name = loadingScreen(page).getByText('Vardaan', { exact: true });
    await expect(name).toBeVisible();
    const before = await name.boundingBox();
    await expect(gate(page)).toBeVisible({ timeout: 20_000 });
    // After its fade-in.
    await page.waitForTimeout(GATE_FADE_IN_SECONDS * 1000 + 100);
    expect(await name.boundingBox()).toEqual(before);
    for (const button of [enterButton(page), quietButton(page)]) {
      const box = (await button.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(GATE_TARGET_MIN_PX);
      expect(box.x).toBeGreaterThanOrEqual(16);
      expect(box.x + box.width).toBeLessThanOrEqual(360 - 16);
    }
    await expect(enterButton(page)).toHaveCSS('color', 'rgb(206, 202, 175)');
    await expect(enterButton(page)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  });

  for (const sound of [true, false]) {
    test(`Enter${sound ? '' : ' without sound'} lifts the screen and saves mute ${sound ? 'off' : 'on'}`, async ({ page }) => {
      await page.goto('/');
      await passGate(page, { sound });
      await expect(page.locator('#root')).not.toHaveAttribute('inert');
      await expect(page.locator('html')).not.toHaveClass('booting');
      await expect(page.getByRole('button', { name: 'Mute' })).toHaveAttribute('aria-pressed', String(!sound));
      expect(await page.evaluate(() => localStorage.getItem('muted'))).toBe(String(!sound));
    });
  }

  test('Enter resumes the audio context in its own press; nothing before it creates one', async ({ page }) => {
    await page.addInitScript(COUNT_AUDIO_CONTEXTS);
    await page.goto('/');
    await expect(gate(page)).toBeVisible({ timeout: 20_000 });
    // Hovering, wheeling and a scroll key under the gate are not the press.
    await page.mouse.move(640, 200);
    await page.mouse.wheel(0, 500);
    await page.keyboard.press('ArrowDown');
    expect(await audioContexts(page)).toBe(0);
    await enterButton(page).click();
    await expect(loadingScreen(page)).toHaveCount(0);
    expect(await audioContexts(page)).toBe(1);
    await expect.poll(() => audioContextStates(page)).toEqual(['running']);
  });

  test('Enter without sound creates no audio context, and presses after it create none', async ({ page }) => {
    await page.addInitScript(COUNT_AUDIO_CONTEXTS);
    await page.goto('/');
    await passGate(page);
    await page.mouse.click(640, 360);
    await page.keyboard.press('Tab');
    expect(await audioContexts(page)).toBe(0);
  });

  test('focuses Enter by default and Enter without sound when mute was saved; Tab moves between them', async ({ page }) => {
    await page.goto('/');
    await expect(gate(page)).toBeVisible({ timeout: 20_000 });
    await expect(enterButton(page)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(quietButton(page)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(enterButton(page)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(quietButton(page)).toBeFocused();

    await page.addInitScript(() => localStorage.setItem('muted', 'true'));
    await page.goto('/');
    await expect(gate(page)).toBeVisible({ timeout: 20_000 });
    await expect(quietButton(page)).toBeFocused();
  });

  test('the keyboard Enter key on the focused button enters with sound', async ({ page }) => {
    await page.addInitScript(COUNT_AUDIO_CONTEXTS);
    await page.goto('/');
    await expect(enterButton(page)).toBeFocused({ timeout: 20_000 });
    await page.keyboard.press('Enter');
    await expect(loadingScreen(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mute' })).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => audioContextStates(page)).toEqual(['running']);
  });

  test('a wheel under the gate moves nothing, swells Enter in proportion and lets it ease back', async ({ page }) => {
    await page.goto('/');
    await expect(gate(page)).toBeVisible({ timeout: 20_000 });
    await page.mouse.move(640, 200);
    await page.evaluate(RECORD_ENERGY);

    // One notch: a swell, back at rest to the eye within about 1 s, and then fully at rest.
    await page.mouse.wheel(0, 100);
    await atRest(page);
    let log = await energyLog(page);
    const small = peak(log);
    expect(small).toBeGreaterThan(0);
    const top = log.find((e) => e.energy === small)!;
    expect(top.transform).toBe(`scale(${1 + GATE_ENERGY_MAX_SCALE * small})`);
    const settled = log.find((e) => e.at > top.at && e.energy < VISUAL_REST)!;
    expect(settled.at - top.at).toBeLessThanOrEqual(1000);
    expect(log.at(-1)!.transform).toBe('');

    // A larger delta gives more.
    await clearEnergyLog(page);
    await page.mouse.wheel(0, 400);
    await atRest(page);
    expect(peak(await energyLog(page))).toBeGreaterThan(small);

    // 100 rapid events fill it, and never past 1.
    await clearEnergyLog(page);
    for (let i = 0; i < 100; i++) await page.mouse.wheel(0, 400);
    log = await energyLog(page);
    expect(peak(log)).toBe(1);
    expect(log.every((e) => e.energy <= 1)).toBe(true);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    // The same wheel scrolls once the gate is passed, so the ones above really would have.
    await passGate(page);
    await page.mouse.wheel(0, 2000);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test('a scroll key under the gate moves nothing and swells Enter, a page key more than an arrow', async ({ page }) => {
    await page.goto('/');
    await expect(gate(page)).toBeVisible({ timeout: 20_000 });
    await page.evaluate(RECORD_ENERGY);

    await page.keyboard.press('ArrowDown');
    await atRest(page);
    const arrow = peak(await energyLog(page));
    expect(arrow).toBeGreaterThan(0);

    await clearEnergyLog(page);
    await page.keyboard.press('PageDown');
    await atRest(page);
    expect(peak(await energyLog(page))).toBeGreaterThan(arrow);

    // Space away from the buttons is a scroll key too; on a button it would press it.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await clearEnergyLog(page);
    await page.keyboard.press('Space');
    expect(peak(await energyLog(page))).toBeGreaterThan(0);
    await expect(gate(page)).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('with reduced motion, scrolling under the gate brightens Enter\'s border but leaves its scale at 1', async ({ page }) => {
    await page.goto('/');
    await expect(gate(page)).toBeVisible({ timeout: 20_000 });
    // Only now: with reduced motion from the start, the site shows its fallback and no gate.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(RECORD_ENERGY);
    await page.mouse.move(640, 200);
    await page.mouse.wheel(0, 400);
    await atRest(page);
    const log = await energyLog(page);
    expect(peak(log)).toBeGreaterThan(0);
    expect(log.every((e) => e.transform === '')).toBe(true);
    expect(Math.max(...log.map((e) => Number(e.border || 0)))).toBeGreaterThan(0.6);
    await expect(enterButton(page)).toHaveCSS('transform', 'none');
  });

  test('scrolling under the gate never dims Enter\'s full border while it is hovered', async ({ page }) => {
    await page.goto('/');
    await expect(gate(page)).toBeVisible({ timeout: 20_000 });
    await enterButton(page).hover();
    await expect(enterButton(page)).toHaveCSS('border-color', 'rgb(206, 202, 175)');
    await page.mouse.wheel(0, 100);
    await expect(enterButton(page)).toHaveAttribute('data-energy', /[1-9]/);
    await expect(enterButton(page)).toHaveCSS('border-color', 'rgb(206, 202, 175)');
  });

  test.describe('on a touch screen', () => {
    test.use({ hasTouch: true });

    test('a touch drag under the gate moves nothing and swells Enter', async ({ page }) => {
      await page.goto('/');
      await expect(gate(page)).toBeVisible({ timeout: 20_000 });
      const cdp = await page.context().newCDPSession(page);
      // A touch drag upward, which scrolls the page down, from low on the screen away from the buttons. Raw touch
      // input: Chromium's synthesized scroll gesture scrolls nothing in headless runs, even on the HTML site.
      const drag = async (moves: number, step: number) => {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 640, y: 650 }] });
        for (let i = 1; i <= moves; i++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 640, y: 650 - i * step }] });
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      };

      await page.evaluate(RECORD_ENERGY);
      await drag(5, 20);
      const short = peak(await energyLog(page));
      expect(short).toBeGreaterThan(0);
      await atRest(page);
      await clearEnergyLog(page);
      await drag(20, 20);
      expect(peak(await energyLog(page))).toBeGreaterThan(short);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);

      await passGate(page);
      await drag(20, 20);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    });
  });
});

import type { Page } from '@playwright/test';
import { PAGE_PATHS } from '../../src/routes';
import { SECTION_T } from '../../src/scene/cameraPath';
import { LAYER_REST_SCALE, MIST_OPACITY, STAR_COUNT } from '../../src/scene/tuning';
import { SECTION_IDS, type SectionId } from '../../src/sections/contract';
import {
  audioContexts,
  COUNT_AUDIO_CONTEXTS,
  expect,
  expectExploring,
  holdChunks,
  scrollToSection,
  test,
  waitForScene,
} from './fixtures';

const layer = (page: Page) => page.locator('.backdrop[data-zone="landing"]');
const images = (page: Page) => layer(page).locator('img.backdrop-image');
const ground = (page: Page) => images(page).nth(1);

const isMedia = (url: string) => /\.(mp4|webm|m4a|mp3|ogg|opus|wav)(\?.*)?$/.test(url);

/** Whether the landing's motion runs, as its layer says. */
const motion = (page: Page) => layer(page).getAttribute('data-motion');

/** The landing still has weight: whatever stopped its motion or silenced its backdrop, it wasn't the camera leaving
 *  the zone. */
const expectLandingCurrent = (page: Page) => expect(layer(page)).toHaveCSS('visibility', 'visible');

/** Opens a page the way Back and Forward do, without moving the scroll: the landing stays the current zone. */
async function openPageInPlace(page: Page, path: string) {
  await page.evaluate((path) => {
    history.pushState(null, '', path);
    dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await expect(page.locator('main.page')).toBeVisible();
}

test('the landing backdrop is two still images behind the canvas, with mist and stars over them', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await expect(images(page)).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    await expect(images(page).nth(i)).toHaveAttribute('src', /\.webp$/);
    await expect(images(page).nth(i)).toHaveAttribute('alt', '');
    await expect(images(page).nth(i)).toHaveJSProperty('complete', true);
  }
  await expect(page.locator('.backdrop video')).toHaveCount(0);
  await expect(layer(page).locator('.backdrop-star')).toHaveCount(STAR_COUNT);
  await expect(layer(page).locator('.backdrop-mist')).toHaveCount(1);
  // The effects fade in once the loading screen has lifted.
  await expect(layer(page)).toHaveAttribute('data-released', '');
  await expect(layer(page).locator('.backdrop-mist')).toHaveCSS('opacity', String(MIST_OPACITY));
  await expect.poll(() => motion(page)).toBe('running');
  // Behind the canvas, which leaves the sky to it.
  const behind = await page.evaluate(() => {
    const backdrops = document.querySelector('.backdrops')!;
    const canvas = document.querySelector('.scene canvas')!;
    return Boolean(backdrops.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(behind).toBe(true);
});

test('the stars sit in the same places on every load, all in the upper sky', async ({ page }) => {
  const places = () =>
    layer(page)
      .locator('.backdrop-star')
      .evaluateAll((stars) => stars.map((star) => [(star as HTMLElement).style.left, (star as HTMLElement).style.top]));
  await page.goto('/');
  await waitForScene(page);
  const first = await places();
  await page.reload();
  await waitForScene(page);
  expect(await places()).toEqual(first);
  for (const [, top] of first) expect(parseFloat(top)).toBeLessThan(45);
});

test('the ground layer shifts against a mouse pointer, eased', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  const transform = () => ground(page).evaluate((el) => (el as HTMLElement).style.transform);
  await page.mouse.move(640, 360);
  await page.waitForTimeout(2_000);
  const middle = await transform();
  await page.mouse.move(1279, 360);
  // Eased: not there on the next frame, but on its way.
  await expect.poll(transform).not.toBe(middle);
  // Up to PARALLAX_MAX_X_PX at the right edge, against the pointer.
  await expect.poll(async () => /^translate3d\(-(9\.\d+|10)px/.test(await transform()), { timeout: 10_000 }).toBe(true);
});

test.describe('on a touch screen', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('the pointer moves nothing', async ({ page }) => {
    await page.goto('/');
    await waitForScene(page);
    const transform = () => ground(page).evaluate((el) => (el as HTMLElement).style.transform);
    await page.waitForTimeout(1_000);
    const before = await transform();
    await page.mouse.move(380, 400);
    await page.touchscreen.tap(380, 400);
    await page.waitForTimeout(1_000);
    expect(await transform()).toBe(before);
  });
});

test('the motion stops while a page is open and starts again once it closes', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await expect.poll(() => motion(page)).toBe('running');
  await openPageInPlace(page, PAGE_PATHS.about);
  await expect.poll(() => motion(page)).toBe('stopped');
  await expect(layer(page).locator('.backdrop-mist')).toHaveCSS('animation-play-state', 'paused');
  await expectLandingCurrent(page);
  await page.goBack();
  await expectExploring(page);
  await expect.poll(() => motion(page)).toBe('running');
  await expect(layer(page).locator('.backdrop-mist')).toHaveCSS('animation-play-state', 'running');
});

test('the motion stops while the tab is hidden', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await expect.poll(() => motion(page)).toBe('running');
  const setVisibility = (state: DocumentVisibilityState) =>
    page.evaluate((state) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
      document.dispatchEvent(new Event('visibilitychange'));
    }, state);
  await setVisibility('hidden');
  await expect.poll(() => motion(page)).toBe('stopped');
  await setVisibility('visible');
  await expect.poll(() => motion(page)).toBe('running');
});

test('the motion stops on the way to About, where the landing has no weight, and the landing brings it back', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await expect.poll(() => motion(page)).toBe('running');
  await scrollToSection(page, 'about');
  await expect.poll(() => motion(page)).toBe('stopped');
  await expect(layer(page)).toHaveCSS('visibility', 'hidden');
  // Nothing is written to the images while it is stopped.
  const still = await images(page).evaluateAll((els) => els.map((el) => (el as HTMLElement).style.transform));
  await page.waitForTimeout(1_000);
  expect(await images(page).evaluateAll((els) => els.map((el) => (el as HTMLElement).style.transform))).toEqual(still);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => motion(page)).toBe('running');
});

test('turning on reduced motion mid-visit leaves the layers still, at rest', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await page.mouse.move(1279, 700);
  await expect.poll(() => motion(page)).toBe('running');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => motion(page)).toBe('stopped');
  const transform = () => ground(page).evaluate((el) => (el as HTMLElement).style.transform);
  const AT_REST = `translate3d(0px, 0px, 0px) scale(${LAYER_REST_SCALE})`;
  await expect.poll(transform).toBe(AT_REST);
  await expect(layer(page).locator('.backdrop-mist')).toHaveCSS('animation-name', 'none');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(500);
  expect(await transform()).toBe(AT_REST);
});

test.describe('the HTML site', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('has no backdrop and fetches no media', async ({ page }) => {
    const media: string[] = [];
    page.on('request', (request) => {
      if (isMedia(request.url()) || request.url().endsWith('.webp')) media.push(request.url());
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Vardaan' })).toBeVisible();
    await page.mouse.click(10, 10);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.backdrop')).toHaveCount(0);
    expect(media).toEqual([]);
  });
});

test('a direct page link keeps the motion stopped under its page', async ({ page }) => {
  await page.goto(PAGE_PATHS.contact);
  await expect(page.locator('main.page')).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => motion(page)).toBe('stopped');
});

test.describe('the landing ambient bed', () => {
  /** Records ambient fetches, decoded buffer lengths, and every gain target the page sets. */
  const RECORD_AUDIO = () => {
    const w = window as unknown as { audio: { decoded: number[]; targets: number[] } };
    w.audio = { decoded: [], targets: [] };
    const decode = AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData = function (this: AudioContext, data: ArrayBuffer) {
      return decode.call(this, data).then((buffer: AudioBuffer) => {
        w.audio.decoded.push(buffer.duration);
        return buffer;
      });
    } as typeof decode;
    const target = AudioParam.prototype.setTargetAtTime;
    AudioParam.prototype.setTargetAtTime = function (this: AudioParam, value: number, start: number, constant: number) {
      w.audio.targets.push(value);
      return target.call(this, value, start, constant);
    };
  };
  const recorded = (page: Page) =>
    page.evaluate(() => (window as unknown as { audio: { decoded: number[]; targets: number[] } }).audio);

  const ambientRequests = (page: Page) => {
    const urls: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('.m4a')) urls.push(request.url());
    });
    return urls;
  };

  test('is fetched only after the first press, loops its whole length, and fades out under an open page', async ({ page }) => {
    const fetched = ambientRequests(page);
    await page.addInitScript(COUNT_AUDIO_CONTEXTS);
    await page.addInitScript(RECORD_AUDIO);
    await page.goto('/');
    await waitForScene(page);
    await page.mouse.move(640, 360);
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(500);
    expect(fetched).toEqual([]);
    expect(await audioContexts(page)).toBe(0);

    await page.mouse.click(640, 360);
    await expect.poll(() => fetched.length).toBe(1);
    expect(await audioContexts(page)).toBe(1);
    // The whole 8.405 s loop decodes, with no encoder padding added at either end to break the seam.
    await expect.poll(async () => (await recorded(page)).decoded).toHaveLength(1);
    expect((await recorded(page)).decoded[0]).toBeCloseTo(8.405, 2);
    await expect.poll(async () => (await recorded(page)).targets.some((v) => v > 0)).toBe(true);

    await openPageInPlace(page, PAGE_PATHS.about);
    await expect.poll(async () => (await recorded(page)).targets.at(-1)).toBe(0);
    await expectLandingCurrent(page);
  });

  test('is never fetched when mute was saved', async ({ page }) => {
    const fetched = ambientRequests(page);
    await page.addInitScript(() => localStorage.setItem('muted', 'true'));
    await page.addInitScript(COUNT_AUDIO_CONTEXTS);
    await page.goto('/');
    await waitForScene(page);
    await page.mouse.click(640, 360);
    await page.keyboard.press('Tab');
    await page.waitForLoadState('networkidle');
    expect(fetched).toEqual([]);
    expect(await audioContexts(page)).toBe(0);
  });

  test('the mute toggle fades it out and back in', async ({ page }) => {
    await page.addInitScript(RECORD_AUDIO);
    await page.goto('/');
    await waitForScene(page);
    await page.mouse.click(640, 360);
    await expect.poll(async () => (await recorded(page)).targets.some((v) => v > 0)).toBe(true);
    const mute = page.getByRole('button', { name: 'Mute' });
    await mute.click();
    await expect(mute).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await recorded(page)).targets.at(-1)).toBe(0);
    await mute.click();
    await expect(mute).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(async () => (await recorded(page)).targets.at(-1)).toBe(1);
  });

  /** The time of the first press, and of the first bed started, from navigation start. */
  const RECORD_START = () => {
    const w = window as unknown as { pressedAt?: number; bedAt?: number };
    addEventListener('pointerdown', () => (w.pressedAt ??= performance.now()), { capture: true });
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (this: AudioBufferSourceNode, ...args: Parameters<typeof start>) {
      w.bedAt ??= performance.now();
      return start.apply(this, args);
    };
  };
  const bedDelay = async (page: Page) => {
    const { pressedAt, bedAt } = await page.evaluate(() => {
      const w = window as unknown as { pressedAt?: number; bedAt?: number };
      return { pressedAt: w.pressedAt, bedAt: w.bedAt };
    });
    return pressedAt === undefined || bedAt === undefined ? null : bedAt - pressedAt;
  };

  test('starts within a second of the first press at the landing, with no scroll', async ({ page }) => {
    await page.addInitScript(RECORD_START);
    await page.goto('/');
    await waitForScene(page);
    await page.mouse.click(640, 360);
    await expect.poll(() => bedDelay(page)).not.toBeNull();
    expect(await bedDelay(page)).toBeLessThan(1000);
  });

  test('starts from a press made while the loading screen is up, before the scene code has arrived', async ({ page }) => {
    await page.addInitScript(COUNT_AUDIO_CONTEXTS);
    await page.addInitScript(RECORD_START);
    const scene = await holdChunks(page, ['sceneMain']);
    await page.goto('/');
    await expect.poll(scene.requested).toBe(1);
    await page.mouse.click(640, 360);
    expect(await audioContexts(page)).toBe(0);
    await scene.release();
    await waitForScene(page);
    // No second press.
    await expect.poll(() => bedDelay(page), { timeout: 15_000 }).not.toBeNull();
    expect(await audioContexts(page)).toBe(1);
  });
});

test.describe("nothing of another zone over the landing's backdrop", () => {
  /** What the canvas says it draws of a section: 0 while hidden, else its opacity. */
  const drawn = async (page: Page, id: SectionId) => Number(await page.locator('.scene canvas').getAttribute(`data-section-${id}`));

  /** Where the About box stood over the landing's sky, behind the name, before sections gave way to the backdrop. */
  const ABOUT_BOX_AT_LANDING = { x: 380, y: 150 };

  test('at the landing no section is drawn, and no marker can be reached or clicked', async ({ page }) => {
    await page.goto('/');
    await waitForScene(page);
    for (const id of SECTION_IDS) await expect.poll(() => drawn(page, id)).toBe(0);
    const markers = page.locator('button.marker');
    for (let i = 0; i < (await markers.count()); i++) await expect(markers.nth(i)).toBeHidden();
    // Tab goes all the way round without landing on a marker.
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement?.classList.contains('marker') ?? false)).toBe(false);
    }
    await page.mouse.click(ABOUT_BOX_AT_LANDING.x, ABOUT_BOX_AT_LANDING.y);
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/$/);
    await expectExploring(page);
  });

  test('halfway to About, the About box is partly drawn', async ({ page }) => {
    await page.goto('/');
    await waitForScene(page);
    await page.evaluate((t) => window.scrollTo(0, Math.round(t * (document.documentElement.scrollHeight - innerHeight))), SECTION_T.about / 2);
    await expect.poll(() => drawn(page, 'about')).toBeGreaterThan(0.2);
    expect(await drawn(page, 'about')).toBeLessThan(0.8);
  });

  test('in the grey zones every section in range is drawn in full, and markers show', async ({ page }) => {
    await page.goto('/');
    await waitForScene(page);
    for (const id of ['about', 'projects', 'experience'] as const) {
      await scrollToSection(page, id);
      await expect.poll(() => drawn(page, id)).toBe(1);
      await expect(page.locator('button.marker:visible').first()).toBeVisible();
    }
  });
});

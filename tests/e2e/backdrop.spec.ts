import type { Page } from '@playwright/test';
import { PAGE_PATHS } from '../../src/routes';
import {
  audioContexts,
  COUNT_AUDIO_CONTEXTS,
  expect,
  expectExploring,
  holdChunks,
  loadingScreen,
  scrollToSection,
  test,
  waitForScene,
} from './fixtures';

const video = (page: Page) => page.locator('.backdrop[data-zone="landing"] video');

const isMedia = (url: string) => /\.(mp4|webm|m4a|mp3|ogg|opus|wav)(\?.*)?$/.test(url);

/** The video's playback position has moved on: it is really playing, not just unpaused. */
async function expectPlaying(page: Page) {
  const start = await video(page).evaluate((v: HTMLVideoElement) => v.currentTime);
  await expect
    .poll(() => video(page).evaluate((v: HTMLVideoElement, start) => !v.paused && v.currentTime !== start, start), { timeout: 15_000 })
    .toBe(true);
}

const paused = (page: Page) => video(page).evaluate((v: HTMLVideoElement) => v.paused);

/** The landing still has weight: whatever paused or silenced its backdrop, it wasn't the camera leaving the zone. */
const expectLandingCurrent = (page: Page) =>
  expect(page.locator('.backdrop[data-zone="landing"]')).toHaveCSS('visibility', 'visible');

/** Opens a page the way Back and Forward do, without moving the scroll: the landing stays the current zone. */
async function openPageInPlace(page: Page, path: string) {
  await page.evaluate((path) => {
    history.pushState(null, '', path);
    dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await expect(page.locator('main.page')).toBeVisible();
}

test('the landing backdrop is a muted, looping, inline video that plays behind the canvas', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await expect(video(page)).toHaveJSProperty('muted', true);
  await expect(video(page)).toHaveJSProperty('defaultMuted', true);
  await expect(video(page)).toHaveJSProperty('loop', true);
  await expect(video(page)).toHaveJSProperty('playsInline', true);
  await expect(video(page)).toHaveAttribute('muted', '');
  await expect(video(page)).toHaveAttribute('loop', '');
  await expect(video(page)).toHaveAttribute('playsinline', '');
  await expect(video(page)).toHaveAttribute('poster', /\.webp$/);
  await expectPlaying(page);
  // Faded in over its poster once it could play.
  await expect(video(page)).toHaveCSS('opacity', '1');
  // Behind the canvas, which leaves the sky to it.
  const behind = await page.evaluate(() => {
    const backdrops = document.querySelector('.backdrops')!;
    const canvas = document.querySelector('.scene canvas')!;
    return Boolean(backdrops.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(behind).toBe(true);
});

test('the video is not fetched while the loading screen is up, and the poster counts as a step', async ({ page }) => {
  const videos: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('.mp4')) videos.push(request.url());
  });
  const held = await holdChunks(page, ['CitationPanel']);
  await page.goto('/');
  // Every step but the held chunk is done, the poster's included.
  await expect(loadingScreen(page)).toHaveAttribute('data-drawn', '', { timeout: 20_000 });
  await expect(loadingScreen(page)).toHaveAttribute('data-done', String(Number(await loadingScreen(page).getAttribute('data-total')) - 1), {
    timeout: 20_000,
  });
  await expect(page.locator('.backdrop[data-zone="landing"] img')).toHaveJSProperty('complete', true);
  expect(videos).toEqual([]);
  await held.release();
  await expect(loadingScreen(page)).toHaveCount(0);
  await expect.poll(() => videos.length).toBeGreaterThan(0);
  await expectPlaying(page);
});

test('the video pauses while a page is open and plays again once it closes', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await expectPlaying(page);
  await openPageInPlace(page, PAGE_PATHS.about);
  await expect.poll(() => paused(page)).toBe(true);
  await expectLandingCurrent(page);
  await page.goBack();
  await expectExploring(page);
  await expectPlaying(page);
});

test('the video pauses while the tab is hidden', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await expectPlaying(page);
  const setVisibility = (state: DocumentVisibilityState) =>
    page.evaluate((state) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
      document.dispatchEvent(new Event('visibilitychange'));
    }, state);
  await setVisibility('hidden');
  await expect.poll(() => paused(page)).toBe(true);
  await setVisibility('visible');
  await expectPlaying(page);
});

test('the video fades out and pauses on the way to About, and the landing weight brings it back', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await expectPlaying(page);
  await scrollToSection(page, 'about');
  await expect.poll(() => paused(page)).toBe(true);
  await expect(page.locator('.backdrop[data-zone="landing"]')).toHaveCSS('visibility', 'hidden');
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectPlaying(page);
});

test.describe('with Save-Data on', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }));
  });

  test('only the poster shows, and no video is fetched', async ({ page }) => {
    const media: string[] = [];
    page.on('request', (request) => {
      if (isMedia(request.url())) media.push(request.url());
    });
    await page.goto('/');
    await waitForScene(page);
    await expect(page.locator('.backdrop video')).toHaveCount(0);
    await expect(page.locator('.backdrop[data-zone="landing"] img')).toHaveAttribute('src', /\.webp$/);
    await expect(page.locator('.backdrop[data-zone="landing"]')).toHaveCSS('visibility', 'visible');
    await page.mouse.click(640, 360);
    await page.waitForLoadState('networkidle');
    expect(media.filter((url) => url.endsWith('.mp4'))).toEqual([]);
  });
});

test.describe('the HTML site', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('has no backdrop video and fetches no media', async ({ page }) => {
    const media: string[] = [];
    page.on('request', (request) => {
      if (isMedia(request.url()) || request.url().endsWith('.webp')) media.push(request.url());
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Vardaan' })).toBeVisible();
    await page.mouse.click(10, 10);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('video')).toHaveCount(0);
    expect(media).toEqual([]);
  });
});

test('a direct page link keeps the video paused under its page', async ({ page }) => {
  await page.goto(PAGE_PATHS.contact);
  await expect(page.locator('main.page')).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => paused(page)).toBe(true);
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
});

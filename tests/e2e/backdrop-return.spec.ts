import type { Page } from '@playwright/test';
import { SECTION_T } from '../../src/scene/cameraPath';
import { expect, scrollToSection, test, waitForScene } from './fixtures';

/**
 * Coming back to the landing from further along the path. The backdrop layer and the dome together must cover the
 * view at every path position, so the bare page background never shows; a video that isn't playing shows its poster.
 */

const layer = (page: Page) => page.locator('.backdrop[data-zone="landing"]');
const video = (page: Page) => layer(page).locator('video');

/** Upper right of the view, in the poster's blue sky and clear of the landing text and the shade. */
const SKY = { x: 0.78, y: 0.55 };

/** One pixel of what is on screen, the canvas and everything behind it composited. */
async function sample(page: Page): Promise<number[]> {
  const png = await page.screenshot();
  const { width, height } = page.viewportSize()!;
  return page.evaluate(
    async ([b64, x, y]) => {
      const image = new Image();
      image.src = `data:image/png;base64,${b64}`;
      await image.decode();
      const canvas = new OffscreenCanvas(image.width, image.height);
      const g = canvas.getContext('2d')!;
      g.drawImage(image, 0, 0);
      return Array.from(g.getImageData(x, y, 1, 1).data.slice(0, 3));
    },
    [png.toString('base64'), Math.round(SKY.x * width), Math.round(SKY.y * height)] as const,
  );
}

/** The page background, as the browser resolved it. */
const pageBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor.match(/\d+/g)!.slice(0, 3).map(Number));

/** Within this per channel of the page background counts as the background showing. Wide enough to catch a black
 *  video frame (0, 0, 0) and the landing's own dark dome colour too, neither of which belongs at the landing. */
const BARE_TOLERANCE = 24;

/** The view at the landing is the backdrop's sky, not the page background: polled while the camera settles. */
async function expectCovered(page: Page) {
  const bg = await pageBackground(page);
  await expect
    .poll(async () => {
      const pixel = await sample(page);
      return pixel.every((c, i) => Math.abs(c - bg[i]) <= BARE_TOLERANCE) ? `page background ${pixel}` : 'covered';
    }, { timeout: 15_000 })
    .toBe('covered');
}

/** The video's playback position moves on: it really plays, not just unpaused. */
async function expectPlaying(page: Page, timeout = 15_000) {
  const start = await video(page).evaluate((v: HTMLVideoElement) => v.currentTime);
  await expect
    .poll(() => video(page).evaluate((v: HTMLVideoElement, start) => !v.paused && v.currentTime !== start, start), { timeout })
    .toBe(true);
}

/** Long enough for the eased camera to bring the landing's weight to exactly 1 after coming back from Contact
 *  (about 5 s), after which nothing about the path changes from frame to frame. */
const SETTLE_MS = 8_000;

const scrollToTop = (page: Page) => page.evaluate(() => window.scrollTo(0, 0));
const scrollToT = (page: Page, t: number) =>
  page.evaluate((t) => window.scrollTo(0, Math.round(t * (document.documentElement.scrollHeight - innerHeight))), t);

/** Ways back to the landing. `away` takes the camera out; `back` brings it home. */
const RETURNS: { name: string; away: (page: Page) => Promise<void>; back: (page: Page) => Promise<void> }[] = [
  { name: 'About and straight back', away: (page) => scrollToT(page, SECTION_T.about).then(() => page.waitForTimeout(300)), back: scrollToTop },
  { name: 'About, settled, and back', away: (page) => scrollToSection(page, 'about').then(() => page.waitForTimeout(2_000)), back: scrollToTop },
  { name: 'Contact and straight back', away: (page) => scrollToT(page, SECTION_T.contact).then(() => page.waitForTimeout(300)), back: scrollToTop },
  { name: 'Contact, settled, and back', away: (page) => scrollToSection(page, 'contact').then(() => page.waitForTimeout(2_000)), back: scrollToTop },
  {
    name: "Contact, then the menu's first item",
    away: (page) => scrollToSection(page, 'contact').then(() => page.waitForTimeout(2_000)),
    back: async (page) => {
      await page.locator('a.menu-link').first().click();
      await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 30_000 }).toBe(0);
    },
  },
];

for (const { name, away, back } of RETURNS) {
  test.describe(`back at the landing: ${name}`, () => {
    test.describe.configure({ timeout: 120_000 });

    test('the view is covered, and stays covered once the camera has settled', async ({ page }) => {
      await page.goto('/');
      await waitForScene(page);
      await expectCovered(page);
      await away(page);
      await back(page);
      await expectCovered(page);
      await expectPlaying(page);
      await page.waitForTimeout(SETTLE_MS);
      await expectCovered(page);
      await expectPlaying(page);
    });

    test('a video the browser pauses after the camera has settled plays again, over its poster meanwhile', async ({ page }) => {
      await page.goto('/');
      await waitForScene(page);
      await away(page);
      await back(page);
      await expectPlaying(page);
      await page.waitForTimeout(SETTLE_MS);
      // As a browser does on its own: to save power, after a decoder fault, or when a play() it accepted falls through.
      await video(page).evaluate((v: HTMLVideoElement) => v.pause());
      await expect(video(page)).toHaveCSS('opacity', '0');
      await expectCovered(page);
      await expectPlaying(page, 5_000);
      await expectCovered(page);
    });
  });
}

/** The ?fps readout's backdrop line: the landing's weight, and the dome's opacity as its material has it and as the
 *  path says it should be. */
async function readDome(page: Page) {
  const text = (await page.locator('[data-readout="backdrop"]').textContent()) ?? '';
  const match = /landing ([\d.]+) .* dome ([\d.]+) \(path ([\d.]+)\)/.exec(text);
  if (!match) throw new Error(`no dome in the readout: ${text}`);
  const [, landing, drawn, path] = match.map(Number);
  return { landing, drawn, path };
}

/** How long to watch the landing after coming back: past the time the camera takes to settle. */
const WATCH_MS = 8_000;

test('back at the landing, the dome fades with the path and never covers the backdrop while the camera settles', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?fps');
  await waitForScene(page);
  await scrollToSection(page, 'about');
  await page.waitForTimeout(2_000);
  const bg = await pageBackground(page);
  await scrollToTop(page);

  const problems: string[] = [];
  let nearLanding = 0;
  const end = Date.now() + WATCH_MS;
  while (Date.now() < end) {
    const dome = await readDome(page);
    if (Math.abs(dome.drawn - dome.path) > 1e-3) problems.push(`dome drawn at ${dome.drawn}, path says ${dome.path}`);
    // Close enough to the landing that the dome is all but gone: nothing dark may cover the sky now.
    if (dome.landing >= 0.999) {
      nearLanding++;
      const pixel = await sample(page);
      if (pixel.every((c, i) => Math.abs(c - bg[i]) <= BARE_TOLERANCE)) problems.push(`page background ${pixel} at weight ${dome.landing}`);
    }
    await page.waitForTimeout(100);
  }
  expect(problems).toEqual([]);
  expect(nearLanding).toBeGreaterThan(3);
});

test('a landing layer that lost its styles shows again, though the camera has settled', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await expectPlaying(page);
  const breakages: [string, (el: HTMLElement) => void][] = [
    ['inline styles removed', (el) => el.removeAttribute('style')],
    ['hidden', (el) => (el.style.visibility = 'hidden')],
    ['faded out', (el) => (el.style.opacity = '0')],
  ];
  for (const [name, breakLayer] of breakages) {
    await test.step(name, async () => {
      await layer(page).evaluate(breakLayer);
      await expect(layer(page)).toHaveCSS('visibility', 'visible');
      await expect(layer(page)).toHaveCSS('opacity', '1');
      await expectCovered(page);
    });
  }
});

test.describe('when the browser refuses play()', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { refusePlay: boolean };
      w.refusePlay = false;
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
        if (w.refusePlay) return Promise.reject(new DOMException('refused by the test', 'NotAllowedError'));
        return play.call(this);
      };
    });
  });

  const refusePlay = (page: Page, refuse: boolean) =>
    page.evaluate((refuse) => {
      (window as unknown as { refusePlay: boolean }).refusePlay = refuse;
    }, refuse);

  test('until well after the camera settles, the poster shows and the video plays once it is allowed', async ({ page }) => {
    await page.goto('/');
    await waitForScene(page);
    await expectPlaying(page);
    await scrollToSection(page, 'about');
    await expect.poll(() => video(page).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await refusePlay(page, true);
    await scrollToTop(page);
    await expect(layer(page)).toHaveCSS('visibility', 'visible');
    await page.waitForTimeout(SETTLE_MS);
    expect(await video(page).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await expect(video(page)).toHaveCSS('opacity', '0');
    await expectCovered(page);
    await refusePlay(page, false);
    await expectPlaying(page, 5_000);
    await expectCovered(page);
  });
});

test('a video that stalls at the landing gives way to its poster, but not at the brief wait of each loop seam', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await expectPlaying(page);
  await expect(video(page)).toHaveCSS('opacity', '1');
  const fire = (type: string) => video(page).evaluate((v: HTMLVideoElement, type) => v.dispatchEvent(new Event(type)), type);

  // A seam: waiting, then playing again well within BACKDROP_STALL_SECONDS.
  await fire('waiting');
  await fire('playing');
  await page.waitForTimeout(800);
  await expect(video(page)).toHaveCSS('opacity', '1');

  // A stall: still waiting past BACKDROP_STALL_SECONDS.
  await fire('waiting');
  await expect(video(page)).toHaveCSS('opacity', '0');
  await expectCovered(page);
  await fire('playing');
  await expect(video(page)).toHaveCSS('opacity', '1');
});

test.describe('a video that never arrives', () => {
  for (const [name, handle] of [
    ['held', () => undefined],
    ['failed', (route: import('@playwright/test').Route) => route.abort()],
  ] as const) {
    test(`shows its poster at the landing when ${name}`, async ({ page }) => {
      await page.route(/\.mp4(\?.*)?$/, (route) => handle(route));
      await page.goto('/');
      await waitForScene(page);
      await expect(layer(page)).toHaveCSS('visibility', 'visible');
      await expect(video(page)).toHaveCSS('opacity', '0');
      await expectCovered(page);
    });
  }
});

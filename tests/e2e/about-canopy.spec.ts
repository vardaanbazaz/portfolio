import type { Page } from '@playwright/test';
import { PAGE_PATHS } from '../../src/routes';
import { ABOUT_TEXT_RUNS } from '../fixtures/aboutText';
import { expect, expectExploring, test, waitForScene } from './fixtures';

/** The About page's canopy (`src/pages/Canopy.tsx`): its look, its motion, and its contrast. */

const canopy = (page: Page) => page.locator('.about .canopy');

/** Every animation running on something inside the canopy, by its CSS animation name. */
const canopyAnimations = (page: Page) =>
  page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => {
        const target = (a.effect as KeyframeEffect | null)?.target;
        return (target instanceof Element && target.closest('.canopy')) || (a as CSSAnimation).animationName?.startsWith('canopy-');
      })
      .map((a) => ({ name: (a as CSSAnimation).animationName, state: a.playState })),
  );

/** Opens a page over the scene without reloading, as a marker press does. */
async function openPageInPlace(page: Page, path: string) {
  await page.evaluate((path) => {
    history.pushState(null, '', path);
    dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await expect(page.locator('main.page')).toBeVisible();
}

/** The highest luminance of any pixel in a screenshot of the view, or of `clip` in it. */
async function lightestIn(page: Page, clip?: { x: number; y: number; width: number; height: number }) {
  const png = (await page.screenshot({ clip })).toString('base64');
  return page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, image.width, image.height);
    const channel = (v: number) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    let lightest = 0;
    for (let i = 0; i < data.length; i += 4) {
      lightest = Math.max(lightest, 0.2126 * channel(data[i]) + 0.7152 * channel(data[i + 1]) + 0.0722 * channel(data[i + 2]));
    }
    return lightest;
  }, `data:image/png;base64,${png}`);
}

/** The canopy holds still: no animation anywhere in it, each patch at its resting strength, no motes and no wash. */
async function expectStill(page: Page) {
  await expect(canopy(page)).toBeAttached();
  expect(await canopyAnimations(page)).toEqual([]);
  const patches = await page.locator('.canopy-patch').evaluateAll((els) =>
    els.map((el) => ({ opacity: getComputedStyle(el).opacity, rest: getComputedStyle(el).getPropertyValue('--patch-rest').trim(), transform: getComputedStyle(el).transform })),
  );
  expect(patches.length).toBeGreaterThan(0);
  for (const { opacity, rest, transform } of patches) {
    expect(Number(opacity)).toBeCloseTo(Number(rest), 4);
    expect(transform).toBe('none');
  }
  await expect(page.locator('.canopy-motes')).toBeHidden();
  await expect(page.locator('.canopy-wash')).toBeHidden();
}

test("keeps the page's words exactly as they were", async ({ page }) => {
  await page.goto(PAGE_PATHS.about);
  const article = page.locator('article.about');
  await expect(article).toBeVisible();
  const normalise = (text: string) => text.replace(/\s+/g, ' ').trim();
  expect(normalise(await article.innerText())).toBe(normalise(ABOUT_TEXT_RUNS.join(' ')));
});

test('the light drifts and the motes rise while the page is open, and all of it stops once it closes', async ({ page }) => {
  await page.goto(PAGE_PATHS.about);
  await expect(canopy(page)).toBeAttached();
  await expect
    .poll(async () => (await canopyAnimations(page)).filter((a) => a.state === 'running').map((a) => a.name).sort())
    .toEqual([...Array(3).fill('canopy-dapple'), ...Array(12).fill('backdrop-mote')].sort());

  await page.getByRole('button', { name: 'Back' }).click();
  await expectExploring(page);
  await expect(canopy(page)).toHaveCount(0);
  expect(await canopyAnimations(page)).toEqual([]);
});

test('with reduced motion on the scene site, nothing in the canopy moves', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page, { worlds: false });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPageInPlace(page, PAGE_PATHS.about);
  await expectStill(page);
});

test.describe('on the HTML site', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('About opens by its URL, in the shade, holding still', async ({ page }) => {
    await page.goto(PAGE_PATHS.about);
    await expect(page.locator('main.page-static')).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    await expectStill(page);
    // The canopy shows over the page's own background (#0d0d0f, luminance 0.004), not under it.
    expect(await lightestIn(page, { x: 2, y: 200, width: 8, height: 8 })).toBeGreaterThan(0.01);
  });
});

const rgb = (css: string): [number, number, number] => {
  const [r, g, b] = css.match(/[\d.]+/g)!.map(Number);
  return [r, g, b];
};

const luminance = ([r, g, b]: [number, number, number]) => {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/** The lightest pixel of the canopy alone (all else hidden), with every patch and mote paused at `phase` of its
 *  cycle: patches across their whole cycle, motes within the stretch where they are at full opacity. */
async function lightestBackground(page: Page, phase: number) {
  await page.evaluate((phase) => {
    for (const animation of document.getAnimations()) {
      const effect = animation.effect as KeyframeEffect | null;
      if (!(effect?.target instanceof Element) || !effect.target.closest('.canopy')) continue;
      const { delay, duration } = effect.getTiming();
      const p = effect.target.classList.contains('canopy-mote') ? 0.15 + 0.7 * phase : phase;
      animation.pause();
      animation.currentTime = Number(delay) + p * Number(duration);
    }
  }, phase);
  return lightestIn(page);
}

for (const [width, height] of [
  [1920, 1080],
  [1366, 768],
  [390, 844],
] as const) {
  test(`at ${width}x${height}, text holds its contrast against the lightest point of the canopy`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(PAGE_PATHS.about);
    await expect(canopy(page)).toBeAttached();
    // The wash of gold has faded: the page is in the shade.
    await expect.poll(async () => (await canopyAnimations(page)).some((a) => a.name === 'canopy-wash')).toBe(false);

    const colors = await page.evaluate(() => {
      const color = (selector: string) => [...document.querySelectorAll(selector)].map((el) => getComputedStyle(el).color);
      return {
        body: color('.about p:not(.verse-gloss), .about li, .about a, .about .verse-gloss, .about .verse-line'),
        large: color('.about h1, .about h2, .about h3, .about cite'),
      };
    });
    await page.addStyleTag({ content: 'body * { visibility: hidden !important; } .canopy, .canopy * { visibility: visible !important; }' });

    let lightest = 0;
    for (const phase of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]) lightest = Math.max(lightest, await lightestBackground(page, phase));
    const contrast = (color: string) => (luminance(rgb(color)) + 0.05) / (lightest + 0.05);

    const body = Math.min(...colors.body.map(contrast));
    const large = Math.min(...colors.large.map(contrast));
    console.log(`${width}x${height}: lightest background luminance ${lightest.toFixed(4)}, body ${body.toFixed(2)}:1, headings and source ${large.toFixed(2)}:1`);
    expect(body).toBeGreaterThanOrEqual(7);
    expect(large).toBeGreaterThanOrEqual(4.5);
  });
}

for (const site of ['scene', 'HTML'] as const) {
  test.describe(`at 360 px on the ${site} site`, () => {
    test.use({
      viewport: { width: 360, height: 780 },
      isMobile: true,
      hasTouch: true,
      contextOptions: { reducedMotion: site === 'HTML' ? 'reduce' : 'no-preference' },
    });

    test('the reading column fits with a 16 px gutter and nothing overlaps', async ({ page }) => {
      await page.goto(PAGE_PATHS.about);
      await expect(page.locator(site === 'HTML' ? 'main.page-static' : 'main.page:not(.page-static)')).toBeVisible();
      await expect(page.locator('article.about')).toBeVisible();
      const layout = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>('main.page')!;
        const box = (el: Element) => {
          const { left, right, top, bottom } = el.getBoundingClientRect();
          return { left, right, top, bottom };
        };
        return {
          sideways: [document.documentElement, main].some((el) => el.scrollWidth > el.clientWidth),
          width: main.clientWidth,
          parts: [...document.querySelectorAll('.about > :not(.canopy)')].map(box),
          leaves: [...document.querySelectorAll('.about :is(h1, h2, h3, p, li, cite, svg)')].map(box),
        };
      });
      expect(layout.sideways).toBe(false);
      for (const { left, right } of [...layout.parts, ...layout.leaves]) {
        expect(left).toBeGreaterThanOrEqual(16 - 0.5);
        expect(right).toBeLessThanOrEqual(layout.width - 16 + 0.5);
      }
      // Each part of the page starts below the one before it ends.
      for (let i = 1; i < layout.parts.length; i++) expect(layout.parts[i].top).toBeGreaterThanOrEqual(layout.parts[i - 1].bottom - 0.5);
      // The links keep their own row.
      const linkTops = await page.locator('.about .link-list li').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
      expect(new Set(linkTops).size).toBe(1);

      if (site === 'scene') {
        // Scrolled to the end, the last line clears the mute toggle fixed over the page.
        await page.locator('main.page').evaluate((el) => el.scrollTo(0, el.scrollHeight));
        const last = (await page.locator('.about .link-list').boundingBox())!;
        const mute = (await page.locator('.mute-toggle').boundingBox())!;
        expect(last.y + last.height).toBeLessThanOrEqual(mute.y);
      }
    });
  });
}

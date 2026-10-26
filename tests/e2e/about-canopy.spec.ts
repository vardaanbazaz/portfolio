import type { Page } from '@playwright/test';
import { PAGE_PATHS } from '../../src/routes';
import { CANOPY_DIM_DISTANCE, CANOPY_DIM_MIN, CANOPY_SPOT_BRIGHTEST, CANOPY_SPOT_OPACITY, CANOPY_SPOTS } from '../../src/pages/canopy';
import { ABOUT_TEXT_RUNS } from '../fixtures/aboutText';
import { expect, expectExploring, marker, scrollToSection, test, waitForScene } from './fixtures';

/** The About page's canopy (`src/pages/Canopy.tsx`): its look, its motion, and its contrast. */

const canopy = (page: Page) => page.locator('.about .canopy');

/** Every animation on something inside the canopy, by its CSS animation name (or, for the spots' flicker, its id),
 *  with its state and whether it follows the scroll rather than time. */
const canopyAnimations = (page: Page) =>
  page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => {
        const target = (a.effect as KeyframeEffect | null)?.target;
        const name = (a as CSSAnimation).animationName ?? a.id;
        return (target instanceof Element && target.closest('.canopy, .canopy-crown, .canopy-wash')) || name?.startsWith('canopy-');
      })
      .map((a) => ({ name: (a as CSSAnimation).animationName ?? a.id, state: a.playState, scroll: a.timeline instanceof ScrollTimeline })),
  );

/** The names of the canopy's animations in the given state, sorted. */
const named = async (page: Page, state: AnimationPlayState) =>
  (await canopyAnimations(page))
    .filter((a) => a.state === state)
    .map((a) => a.name)
    .sort();

/** Scrolls the page (the scene's page, or the document on the HTML site) to `y`, and waits for the frame to draw. */
async function scrollPage(page: Page, y: number | 'end') {
  await page.evaluate(async (y) => {
    const main = document.querySelector<HTMLElement>('main.page')!;
    const scroller = main.scrollHeight > main.clientHeight ? main : document.scrollingElement!;
    scroller.scrollTo(0, y === 'end' ? scroller.scrollHeight : y);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, y);
}

/** How far the page scrolls, and the painting's strength, its fixed layer's place and its image's place. */
const paintingAt = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('main.page')!;
    const scroller = main.scrollHeight > main.clientHeight ? main : document.scrollingElement!;
    const crown = document.querySelector('.canopy-crown')!;
    const image = document.querySelector('.canopy-image')!.getBoundingClientRect();
    return {
      scroll: scroller.scrollTop,
      maxScroll: scroller.scrollHeight - scroller.clientHeight,
      // The painting shows at one less the opacity of the shade's veil over it.
      opacity: 1 - Number(getComputedStyle(crown, '::after').opacity),
      crownTop: crown.getBoundingClientRect().top,
      image: [image.left, image.top, image.width, image.height].map((v) => Math.round(v * 10) / 10),
    };
  });

/** Dims as the page scrolls: full strength at the top, never brightening on the way down, and once scrolled
 *  `CANOPY_DIM_DISTANCE` view heights (where the page is long enough to), at `CANOPY_DIM_MIN`. The painting itself
 *  never moves. */
async function expectFixedAndDimming(page: Page) {
  await scrollPage(page, 0);
  const top = await paintingAt(page);
  expect(top.opacity).toBeCloseTo(1, 2);
  expect(top.crownTop).toBe(0);
  let last = top;
  for (const y of [100, 300, 600, 900, 1200, 1600, 'end'] as const) {
    await scrollPage(page, y);
    const now = await paintingAt(page);
    expect(now.crownTop).toBe(0);
    expect(now.image).toEqual(top.image);
    expect(now.opacity).toBeLessThanOrEqual(last.opacity + 1e-6);
    last = now;
  }
  expect(last.scroll).toBe(last.maxScroll);
  expect(last.opacity).toBeLessThan(top.opacity);
  const height = page.viewportSize()!.height;
  if (last.maxScroll >= CANOPY_DIM_DISTANCE * height) expect(last.opacity).toBeCloseTo(CANOPY_DIM_MIN, 2);
  else expect(last.opacity).toBeGreaterThan(CANOPY_DIM_MIN);
}

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

/** The canopy holds still: nothing in it runs on time (only the dim, which follows the scroll), the glow at rest, the
 *  spots at dim, no motes and no wash; and the painting stays where it is as the page scrolls, dimming. */
async function expectStill(page: Page) {
  await expect(canopy(page)).toBeAttached();
  await expect.poll(() => canopyAnimations(page)).toEqual([{ name: 'canopy-dim', state: 'running', scroll: true }]);
  const glow = await page.locator('.canopy-glow').evaluate((el) => ({ opacity: getComputedStyle(el).opacity, rest: getComputedStyle(el).getPropertyValue('--glow-rest').trim() }));
  expect(Number(glow.opacity)).toBeCloseTo(Number(glow.rest), 4);
  for (const opacity of await page.locator('.canopy-spot').evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity))))
    expect(opacity).toBeCloseTo(CANOPY_SPOT_OPACITY.dim, 4);
  await expect(page.locator('.canopy-motes')).toBeHidden();
  await expect(page.locator('.canopy-wash')).toBeHidden();
  await expectFixedAndDimming(page);
}

test("keeps the page's words exactly as they were", async ({ page }) => {
  await page.goto(PAGE_PATHS.about);
  const article = page.locator('article.about');
  await expect(article).toBeVisible();
  const normalise = (text: string) => text.replace(/\s+/g, ' ').trim();
  expect(normalise(await article.innerText())).toBe(normalise(ABOUT_TEXT_RUNS.join(' ')));
});

test('the spots flicker, the glow breathes and the motes rise while the page is open, and all of it stops once it closes', async ({ page }) => {
  await page.goto(PAGE_PATHS.about);
  await expect(canopy(page)).toBeAttached();
  const motion = ['canopy-glow', ...Array(CANOPY_SPOTS.length).fill('canopy-spot'), ...Array(12).fill('backdrop-mote')];
  await expect.poll(() => named(page, 'running')).toEqual(['canopy-dim', ...motion].sort());
  // Only the dim follows the scroll; everything else runs on time.
  expect((await canopyAnimations(page)).filter((a) => a.scroll).map((a) => a.name)).toEqual(['canopy-dim']);

  // They really move: the spots change. The painting itself has nothing running on time.
  const spots = () => page.evaluate(() => [...document.querySelectorAll('.canopy-spot')].map((el) => getComputedStyle(el).opacity).join(' '));
  expect(await page.evaluate(() => ['.canopy-plate', '.canopy-image'].flatMap((s) => document.querySelector(s)!.getAnimations()).length)).toBe(0);
  const before = await spots();
  await expect.poll(spots).not.toBe(before);

  await page.getByRole('button', { name: 'Back' }).click();
  await expectExploring(page);
  await expect(canopy(page)).toHaveCount(0);
  expect(await canopyAnimations(page)).toEqual([]);
});

test('the painting stays fixed to the view while the page scrolls over it, and dims into the shade', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE_PATHS.about);
  await expect(canopy(page)).toBeAttached();
  await expectFixedAndDimming(page);
});

test('at 1920x1080 the painting stays fixed and dims as far as the page scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(PAGE_PATHS.about);
  await expect(canopy(page)).toBeAttached();
  await expectFixedAndDimming(page);
});

test('the motion pauses while the tab is hidden, the dim still following the scroll, and resumes when it is shown', async ({ page }) => {
  await page.goto(PAGE_PATHS.about);
  await expect(canopy(page)).toBeAttached();
  await expect.poll(async () => (await named(page, 'running')).length).toBe(1 + CANOPY_SPOTS.length + 12 + 1);
  const setVisibility = (state: DocumentVisibilityState) =>
    page.evaluate((state) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
      document.dispatchEvent(new Event('visibilitychange'));
    }, state);
  await setVisibility('hidden');
  await expect.poll(() => named(page, 'running')).toEqual(['canopy-dim']);
  await setVisibility('visible');
  await expect.poll(async () => (await named(page, 'running')).length).toBe(1 + CANOPY_SPOTS.length + 12 + 1);
  expect(await named(page, 'paused')).toEqual([]);
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

/** Every request for the canopy painting, at either width. */
const recordCanopyRequests = (page: Page) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/\/assets\/about-canopy(-960)?-[\w-]+\.webp$/.test(request.url())) requests.push(request.url());
  });
  return requests;
};

test('the painting is fetched only once the visitor heads for About, not when the site or the page code loads', async ({ page }) => {
  const requests = recordCanopyRequests(page);
  const aboutChunk = page.waitForResponse(/\/assets\/AboutPage-[\w-]+\.js$/);
  await page.goto('/');
  await waitForScene(page);
  // The About page's code has arrived in the background, and the painting has not been asked for.
  await aboutChunk;
  await page.waitForLoadState('networkidle');
  expect(requests).toEqual([]);

  // Focusing the About marker starts it.
  await scrollToSection(page, 'about');
  // Arriving at About is not heading for it: nothing yet.
  await page.waitForLoadState('networkidle');
  expect(requests).toEqual([]);
  // The marker is hidden until it has been placed, and a hidden button can't take focus.
  await expect(marker(page, 'About')).toBeVisible();
  await marker(page, 'About').focus();
  await expect(marker(page, 'About')).toBeFocused();
  await expect.poll(() => requests.length).toBe(1);

  // Opening the page uses what was fetched: one request in all.
  await marker(page, 'About').press('Enter');
  await expect(page.locator('main.page article.about')).toBeVisible();
  await expect.poll(() => page.locator('.canopy-image').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(requests).toHaveLength(1);
});

test('opened by its URL, the page fetches the painting itself', async ({ page }) => {
  const requests = recordCanopyRequests(page);
  await page.goto(PAGE_PATHS.about);
  await expect(page.locator('article.about')).toBeVisible();
  await expect.poll(() => requests.length).toBe(1);
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

/** Holds the glow at its brightest, every spot at its brightest and every mote at `phase` of the
 *  stretch where it is at full opacity. The painting's dim follows the scroll and is left alone. */
async function holdLight(page: Page, phase: number) {
  await page.evaluate(
    ([phase, brightest]) => {
      for (const animation of document.getAnimations()) {
        const effect = animation.effect as KeyframeEffect | null;
        if (!(effect?.target instanceof Element) || !effect.target.closest('.canopy-plate')) continue;
        const { delay, duration } = effect.getTiming();
        const name = (animation as CSSAnimation).animationName ?? animation.id;
        const p =
          name === 'canopy-spot' ? brightest
          : effect.target.classList.contains('canopy-mote') ? 0.15 + 0.7 * phase
          : 0.5;
        animation.pause();
        animation.currentTime = Number(delay) + p * Number(duration);
      }
    },
    [phase, CANOPY_SPOT_BRIGHTEST] as const,
  );
}

/** For each text line in the view (a client rect of each text node), the luminance of the lightest pixel behind
 *  it: a screenshot with the text made transparent, everything else as drawn (painting, glow, motes, local shades). */
async function lightestBehindText(page: Page) {
  const png = (await page.screenshot()).toString('base64');
  return page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const { data, width, height } = context.getImageData(0, 0, image.width, image.height);
    const channel = (v: number) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const lines: { kind: 'body' | 'large'; text: string; color: string; lightest: number }[] = [];
    const walker = document.createTreeWalker(document.querySelector('article.about')!, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue;
      const owner = node.parentElement!;
      const kind = owner.closest('h1, h2, h3, cite') ? 'large' : 'body';
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        const [x0, y0, x1, y1] = [Math.floor(rect.left), Math.floor(rect.top), Math.ceil(rect.right), Math.ceil(rect.bottom)];
        if (x0 < 0 || y0 < 0 || x1 > width || y1 > height || x1 <= x0) continue;
        let lightest = 0;
        for (let y = y0; y < y1; y++)
          for (let x = x0; x < x1; x++) {
            const i = (y * width + x) * 4;
            lightest = Math.max(lightest, 0.2126 * channel(data[i]) + 0.7152 * channel(data[i + 1]) + 0.0722 * channel(data[i + 2]));
          }
        lines.push({ kind, text: node.textContent.trim(), color: owner.dataset.color!, lightest });
      }
    }
    return lines;
  }, `data:image/png;base64,${png}`);
}

/** Scroll steps for the contrast sweep, as a share of the view's height: fine enough that no line skips a bright gap
 *  the painting holds still under. */
const CONTRAST_STEP = 1 / 8;

for (const [width, height] of [
  [1920, 1080],
  [1366, 768],
  [390, 844],
] as const) {
  test(`at ${width}x${height}, every line of text holds its contrast against the lightest pixel behind it`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(PAGE_PATHS.about);
    await expect(canopy(page)).toBeAttached();
    await expect.poll(() => page.locator('.canopy-image').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    // The wash of gold has faded: the page is in the shade.
    await expect.poll(async () => (await canopyAnimations(page)).some((a) => a.name === 'canopy-wash')).toBe(false);

    // Each text's own colour, kept before the text is made transparent; then only the background is drawn.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll<HTMLElement>('article.about *')) el.dataset.color = getComputedStyle(el).color;
    });
    await page.addStyleTag({
      content:
        'article.about, article.about * { color: transparent !important; text-decoration-color: transparent !important; } .spiral-divider, .page-back, .mute-toggle, .section-menu, .menu-toggle, .menu { visibility: hidden !important; }',
    });

    const scroller = await page.evaluate(() => {
      const main = document.querySelector<HTMLElement>('main.page')!;
      return main.scrollHeight > main.clientHeight ? 'main' : 'root';
    });
    const maxScroll = await page.evaluate((s) => {
      const el = s === 'main' ? document.querySelector('main.page')! : document.documentElement;
      return el.scrollHeight - el.clientHeight;
    }, scroller);

    // The painting covers its fixed layer (the view, less any scrollbar): no edge of it shows. Placing it by percentages
    // can leave it a few thousandths of a px short, less than half a pixel, which draws as covered.
    const SUBPIXEL = 0.5;
    const cover = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const [crown, plate] = [box('.canopy-crown'), box('.canopy-plate')];
      return { crown: [crown.left, crown.top, crown.right, crown.bottom], painting: [plate.left, plate.top, plate.right, plate.bottom] };
    });
    expect(cover.painting[0]).toBeLessThanOrEqual(cover.crown[0] + SUBPIXEL);
    expect(cover.painting[1]).toBeLessThanOrEqual(cover.crown[1] + SUBPIXEL);
    expect(cover.painting[2]).toBeGreaterThanOrEqual(cover.crown[2] - SUBPIXEL);
    expect(cover.painting[3]).toBeGreaterThanOrEqual(cover.crown[3] - SUBPIXEL);

    const worst = new Map<string, { kind: string; contrast: number; scroll: number }>();
    for (let scroll = 0; ; scroll = Math.min(maxScroll, scroll + Math.round(height * CONTRAST_STEP))) {
      await scrollPage(page, scroll);
      for (const phase of [0, 0.33, 0.67, 1]) {
        await holdLight(page, phase);
        for (const line of await lightestBehindText(page)) {
          const contrast = (luminance(rgb(line.color)) + 0.05) / (line.lightest + 0.05);
          const key = `${line.kind}:${line.text}`;
          if (!worst.has(key) || contrast < worst.get(key)!.contrast) worst.set(key, { kind: line.kind, contrast, scroll });
        }
      }
      if (scroll >= maxScroll) break;
    }

    const lowest = (kind: string) => Math.min(...[...worst.values()].filter((w) => w.kind === kind).map((w) => w.contrast));
    const report = [...worst.entries()].sort((a, b) => a[1].contrast - b[1].contrast).slice(0, 6);
    console.log(
      `${width}x${height}: body ${lowest('body').toFixed(2)}:1, headings and source ${lowest('large').toFixed(2)}:1; lowest lines: ${report
        .map(([key, w]) => `${key.slice(0, 30)} ${w.contrast.toFixed(2)} @${w.scroll}`)
        .join('; ')}`,
    );
    expect(worst.size).toBe(ABOUT_TEXT_RUNS.length);
    expect(lowest('body')).toBeGreaterThanOrEqual(7);
    expect(lowest('large')).toBeGreaterThanOrEqual(4.5);
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
          parts: [...document.querySelectorAll('.about > :not(.canopy, .canopy-crown, .canopy-wash)')].map(box),
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

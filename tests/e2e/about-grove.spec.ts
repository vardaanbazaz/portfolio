import type { Page } from '@playwright/test';
import { PAGE_PATHS } from '../../src/routes';
import { SECTION_T } from '../../src/scene/cameraPath';
import { BLOOM_PEAK, OBJECT_MARKER_GAP_PX } from '../../src/scene/tuning';
import { SECTION_IDS } from '../../src/sections/contract';
import { expect, expectExploring, marker, scrollToSection, test, waitForScene } from './fixtures';

const grove = (page: Page) => page.locator('.backdrop[data-zone="about"]');
const landing = (page: Page) => page.locator('.backdrop[data-zone="landing"]');
/** The box over the stone's rect, which holds its light. */
const stone = (page: Page) => grove(page).locator('.backdrop-object');
const bloom = (page: Page) => page.locator('.backdrop-bloom');
const aboutMarker = (page: Page) => marker(page, 'About');

const box = async (locator: ReturnType<Page['locator']>) => (await locator.boundingBox())!;

/** Scrolls the window to path position t, as a visitor's scroll would. */
const scrollToT = (page: Page, t: number) =>
  page.evaluate((t) => window.scrollTo(0, Math.round(t * (document.documentElement.scrollHeight - innerHeight))), t);

/** The ?fps readout's backdrop line: the path position and whether the dome is drawn. */
async function readout(page: Page) {
  const text = (await page.locator('[data-readout="backdrop"]').textContent()) ?? '';
  const match = /^t ([\d.]+) .* dome ([\d.]+) \(path ([\d.]+)\) (drawn|off)/.exec(text);
  if (!match) throw new Error(`no dome in the readout: ${text}`);
  return { t: Number(match[1]), opacity: Number(match[2]), drawn: match[4] === 'drawn' };
}

/** What the canvas says it draws of a section: 0 while hidden, else its opacity. */
const drawn = async (page: Page, id: string) => Number(await page.locator('.scene canvas').getAttribute(`data-section-${id}`));

/** The stone's masks as the page has them: each image's pixels, read in the page. The outline is named on the stone's
 *  box, since nothing in the page shows it. */
async function readMasks(page: Page) {
  return page.evaluate(async () => {
    const read = async (src: string) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const g = canvas.getContext('2d')!;
      g.drawImage(image, 0, 0);
      return { width: canvas.width, height: canvas.height, data: Array.from(g.getImageData(0, 0, canvas.width, canvas.height).data) };
    };
    const outlineSrc = document.querySelector<HTMLElement>('.backdrop[data-zone="about"] .backdrop-object')!.dataset.outline!;
    const glowSrc = document.querySelector<HTMLImageElement>('.backdrop[data-zone="about"] img.backdrop-object-glow')!.currentSrc;
    const [outline, glow] = await Promise.all([read(outlineSrc), read(glowSrc)]);
    return { outline, glow };
  });
}
type Masks = Awaited<ReturnType<typeof readMasks>>;

/** The grove's pixels in a window of it, read in the page: from `from` to `to` (fractions of its size), grown right
 *  and down by `grow` px. Only a window: the whole picture's pixels are too many to hand to the test. */
async function readGrove(page: Page, from: [x: number, y: number], to: [x: number, y: number], grow: [x: number, y: number]) {
  return page.evaluate(
    async ({ from, to, grow }) => {
      const image = new Image();
      image.src = document.querySelector<HTMLImageElement>('.backdrop[data-zone="about"] img.backdrop-image')!.currentSrc;
      await image.decode();
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      const x0 = Math.round(width * from[0]);
      const y0 = Math.round(height * from[1]);
      const w = Math.min(width, Math.round(width * to[0]) + grow[0]) - x0;
      const h = Math.min(height, Math.round(height * to[1]) + grow[1]) - y0;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const g = canvas.getContext('2d')!;
      g.drawImage(image, 0, 0);
      return { width, height, x0, y0, w, data: Array.from(g.getImageData(x0, y0, w, h).data) };
    },
    { from, to, grow },
  );
}

const solidAt = ({ outline }: Masks, x: number, y: number) => outline.data[(y * outline.width + x) * 4 + 3] >= 128;

/** A view point for a pixel of the stone's rect (its masks' px), by the box drawn over it. */
async function viewPoint(page: Page, masks: Masks, x: number, y: number) {
  const b = await box(stone(page));
  return { x: b.x + ((x + 0.5) / masks.outline.width) * b.width, y: b.y + ((y + 0.5) / masks.outline.height) * b.height };
}

/** The stone's top as its outline has it: its first solid row, and the middle of the solid run there. */
function outlineTop(masks: Masks) {
  const { width, height } = masks.outline;
  for (let y = 0; y < height; y++) {
    const run = [];
    for (let x = 0; x < width; x++) if (solidAt(masks, x, y)) run.push(x);
    if (run.length) return { x: (run[0] + run[run.length - 1]) / 2, y, run: [run[0], run[run.length - 1]] };
  }
  throw new Error('empty outline');
}

test('a press on the stone opens the About page', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'about');
  await expect(aboutMarker(page)).toBeVisible();
  const masks = await readMasks(page);
  // The middle of the stone's solid run, a third of the way down: on the stone, clear of its edges.
  const y = Math.round(masks.outline.height / 3);
  const run = [];
  for (let x = 0; x < masks.outline.width; x++) if (solidAt(masks, x, y)) run.push(x);
  const at = await viewPoint(page, masks, Math.round((run[0] + run[run.length - 1]) / 2), y);
  await page.mouse.click(at.x, at.y);
  await expect(page).toHaveURL(new RegExp(`${PAGE_PATHS.about}$`));
  await expect(page.locator('main.page')).toBeVisible();
});

test.describe('at 1366x768', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('a press beside the stone opens nothing: inside its rect but off its outline, or just outside it', async ({ page }) => {
    await page.goto('/');
    await waitForScene(page);
    await scrollToSection(page, 'about');
    await expect(aboutMarker(page)).toBeVisible();
    const masks = await readMasks(page);
    const { width, height } = masks.outline;
    // Pixels off the outline with nothing solid within 8 px of them: the sky above the plinth's corners, and the
    // meadow beside the stone.
    const clear = (x: number, y: number) => {
      for (let dy = -8; dy <= 8; dy++) {
        for (let dx = -8; dx <= 8; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < width && yy < height && solidAt(masks, xx, yy)) return false;
        }
      }
      return true;
    };
    const beside: { x: number; y: number }[] = [];
    for (const [fx, fy] of [[0.05, 0.05], [0.95, 0.1], [0.05, 0.6], [0.97, 0.7]]) {
      const x = Math.round(fx * (width - 1));
      const y = Math.round(fy * (height - 1));
      expect(clear(x, y), `rect point ${fx},${fy} is clear of the stone`).toBe(true);
      beside.push(await viewPoint(page, masks, x, y));
    }
    const b = await box(stone(page));
    beside.push({ x: b.x + b.width + 12, y: b.y + b.height / 2 });
    for (const at of beside) {
      await page.mouse.click(at.x, at.y);
      await page.waitForTimeout(400);
      await expect(page).toHaveURL(/#about$/);
      await expectExploring(page);
    }
  });
});

test('Enter on the About marker opens the About page, its name unchanged', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'about');
  await expect(page.getByRole('button', { name: 'Open About' })).toBeVisible();
  await aboutMarker(page).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`${PAGE_PATHS.about}$`));
  await expect(page.locator('main.page')).toBeVisible();
});

test('the area that takes presses on the stone is hidden from screen readers and never focused', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'about');
  const hit = page.locator('.backdrop-hit');
  await expect(hit).toHaveAttribute('aria-hidden', 'true');
  await expect(hit).not.toHaveAttribute('tabindex');
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.classList.contains('backdrop-hit') ?? false)).toBe(false);
  }
});

test("the About marker pins just above the traced stone's top, and follows it as the pointer moves the grove", async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'about');
  await expect(aboutMarker(page)).toBeVisible();
  const masks = await readMasks(page);
  const top = outlineTop(masks);
  for (const [px, py] of [[0, 0], [1279, 719], [640, 360]]) {
    await page.mouse.move(px, py);
    await page.waitForTimeout(2_500);
    const at = await viewPoint(page, masks, top.x, top.y);
    const left = await viewPoint(page, masks, top.run[0], top.y);
    const right = await viewPoint(page, masks, top.run[1], top.y);
    const m = await box(aboutMarker(page));
    const centre = m.x + m.width / 2;
    // Over the stone's top: within its solid run there, and within a px of the run's middle.
    expect(centre).toBeGreaterThanOrEqual(left.x - 1);
    expect(centre).toBeLessThanOrEqual(right.x + 1);
    expect(Math.abs(centre - at.x)).toBeLessThan(2);
    // Its bottom the gap above the top row's top edge.
    const topEdge = at.y - (0.5 / masks.outline.height) * (await box(stone(page))).height;
    expect(Math.abs(m.y + m.height - (topEdge - OBJECT_MARKER_GAP_PX))).toBeLessThan(1.5);
  }
});

test('hovering the stone or its marker brightens its light', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'about');
  const bright = stone(page).locator('.backdrop-object-light-hover');
  await expect(bright).toHaveCSS('opacity', '0');
  await aboutMarker(page).hover();
  await expect(stone(page)).toHaveAttribute('data-hover', '');
  await expect.poll(async () => Number(await bright.evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0.4);
  await page.mouse.move(5, 5);
  await expect(stone(page)).not.toHaveAttribute('data-hover');
  const masks = await readMasks(page);
  const at = await viewPoint(page, masks, Math.round(masks.outline.width / 2), Math.round(masks.outline.height / 2));
  await page.mouse.move(at.x, at.y);
  await expect(stone(page)).toHaveAttribute('data-hover', '');
});

test('hovering the stone starts fetching the About page\'s painting, once', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/\/assets\/about-canopy(-960)?-[\w-]+\.webp$/.test(request.url())) requests.push(request.url());
  });
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'about');
  await page.waitForLoadState('networkidle');
  expect(requests).toEqual([]);
  const masks = await readMasks(page);
  const at = await viewPoint(page, masks, Math.round(masks.outline.width / 2), Math.round(masks.outline.height / 2));
  await page.mouse.move(at.x, at.y);
  await expect(stone(page)).toHaveAttribute('data-hover', '');
  await expect.poll(() => requests.length).toBe(1);
  await page.mouse.move(5, 5);
  await page.mouse.move(at.x, at.y);
  await page.waitForLoadState('networkidle');
  expect(requests).toHaveLength(1);
});

test("the glow shows only in the spiral's mask: on the stone, on the grove's gold pixels, and nowhere else", async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'about');
  const glows = stone(page).locator('img.backdrop-object-glow');
  await expect(glows).toHaveCount(2);
  // Drawn exactly over the stone's rect.
  const [glowBox, rectBox] = await stone(page).evaluate((el) =>
    [el.querySelector('img.backdrop-object-glow')!, el].map((e) => e.getBoundingClientRect().toJSON()),
  );
  expect(glowBox).toEqual(rectBox);
  const masks = await readMasks(page);
  const { outline, glow } = masks;
  expect([glow.width, glow.height]).toEqual([outline.width, outline.height]);
  // The rect's place in the grove, found by matching the glow to the grove: the offset where the glow's lit pixels sit
  // on the grove's most golden ones. It is in the left half of the grove, around its middle rows.
  const base = await readGrove(page, [0.2, 0.4], [0.35, 0.65], [outline.width, outline.height]);
  const gold = (x: number, y: number) => {
    const i = ((y - base.y0) * base.w + x - base.x0) * 4;
    return Math.min(base.data[i], base.data[i + 1]) - base.data[i + 2];
  };
  let offStone = 0;
  let lit = 0;
  let solid = 0;
  const litPixels: [number, number][] = [];
  const plainPixels: [number, number][] = [];
  for (let y = 0; y < outline.height; y++) {
    for (let x = 0; x < outline.width; x++) {
      const i = (y * outline.width + x) * 4 + 3;
      const isSolid = outline.data[i] >= 128;
      if (glow.data[i] > 0 && !isSolid) offStone++;
      if (isSolid) solid++;
      if (isSolid && glow.data[i] > 128) {
        lit++;
        litPixels.push([x, y]);
      } else if (isSolid && glow.data[i] === 0) plainPixels.push([x, y]);
    }
  }
  expect(offStone).toBe(0);
  expect(lit / solid).toBeGreaterThan(0.05);
  expect(lit / solid).toBeLessThan(0.3);
  let best = { mean: -Infinity, dx: 0, dy: 0 };
  for (let dy = Math.round(base.height * 0.4); dy < Math.round(base.height * 0.65); dy += 2) {
    for (let dx = Math.round(base.width * 0.2); dx < Math.round(base.width * 0.35); dx += 2) {
      let sum = 0;
      for (let k = 0; k < litPixels.length; k += 7) sum += gold(dx + litPixels[k][0], dy + litPixels[k][1]);
      const mean = sum / Math.ceil(litPixels.length / 7);
      if (mean > best.mean) best = { mean, dx, dy };
    }
  }
  // Lit pixels are gold in the grove; the stone's other pixels are not.
  expect(best.mean).toBeGreaterThan(25);
  let plain = 0;
  for (const [x, y] of plainPixels) plain += gold(best.dx + x, best.dy + y);
  // The whole stone is painted in warm dawn light, so its other pixels lean a little gold too (measured: lit 83 on
  // average, the rest 9.7); the spiral's are many times more so.
  expect(plain / plainPixels.length).toBeLessThan(best.mean / 4);
});

test("the stone's light stays on it: its plane is posed exactly as the grove under it, wherever the pointer and the camera are", async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  // Both read in one go, so no frame falls between them.
  const poses = () =>
    grove(page).evaluate((el) =>
      ['.backdrop-object-plane', 'img.backdrop-image'].map((s) => el.querySelector<HTMLElement>(s)!.style.transform),
    );
  for (const t of [SECTION_T.about, (SECTION_T.about + SECTION_T.projects) / 2 - 0.04]) {
    await scrollToT(page, t);
    for (const [px, py] of [[0, 0], [1279, 719]]) {
      await page.mouse.move(px, py);
      await page.waitForTimeout(1_500);
      const [stonePose, groundPose] = await poses();
      expect(stonePose).toMatch(/^translate3d/);
      expect(stonePose).toBe(groundPose);
    }
  }
});

test('no uniform haze covers the view halfway to About: every full-view layer there is see-through, and the bloom is a radial light', async ({ page }) => {
  await page.goto('/?fps');
  await waitForScene(page);
  await scrollToT(page, SECTION_T.about / 2);
  await expect.poll(async () => Math.abs((await readout(page)).t - SECTION_T.about / 2), { timeout: 15_000 }).toBeLessThan(5e-4);
  await expect(page.locator('.backdrop-haze')).toHaveCount(0);
  const flat = await page.evaluate(() => {
    const found: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('.scene *')) {
      const r = el.getBoundingClientRect();
      if (r.width < innerWidth * 0.95 || r.height < innerHeight * 0.95 || !el.checkVisibility({ visibilityProperty: true })) continue;
      const style = getComputedStyle(el);
      // Images are the pictures themselves; anything else covering the view must not be a flat colour.
      if (el.tagName === 'IMG' || el.tagName === 'CANVAS') continue;
      if (style.backgroundColor !== 'rgba(0, 0, 0, 0)') found.push(`${el.className}: ${style.backgroundColor}`);
    }
    return found;
  });
  expect(flat).toEqual([]);
  await expect(bloom(page)).toHaveCSS('background-image', /^radial-gradient/);
});

test('the bloom is at 0 at both stops and peaks at the midpoint', async ({ page }) => {
  await page.goto('/?fps');
  await waitForScene(page);
  await expect(bloom(page)).toHaveCSS('visibility', 'hidden');
  const opacityAt = async (t: number) => {
    await scrollToT(page, t);
    await expect.poll(async () => Math.abs((await readout(page)).t - t), { timeout: 15_000 }).toBeLessThan(5e-4);
    return Number(await bloom(page).evaluate((el) => (el as HTMLElement).style.opacity));
  };
  const quarter = await opacityAt(SECTION_T.about / 4);
  const mid = await opacityAt(SECTION_T.about / 2);
  const threeQuarters = await opacityAt((3 * SECTION_T.about) / 4);
  expect(mid).toBeGreaterThan(BLOOM_PEAK - 0.01);
  expect(quarter).toBeLessThan(mid);
  expect(threeQuarters).toBeLessThan(mid);
  await expect(bloom(page)).toHaveCSS('visibility', 'visible');
  await scrollToSection(page, 'about');
  await expect(bloom(page)).toHaveCSS('visibility', 'hidden', { timeout: 15_000 });
  await scrollToT(page, 0);
  await expect(bloom(page)).toHaveCSS('visibility', 'hidden', { timeout: 15_000 });
});

test('during the crossing at most three full-view layers change at once, none with a filter or a changing mask, and the empty canvas is hidden', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?fps');
  await waitForScene(page);
  const snapshot = () =>
    page.evaluate(() => {
      const out: Record<string, string> = {};
      const all = Array.from(document.querySelectorAll<HTMLElement>('.scene, .scene *'));
      all.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        if (r.width * r.height < 0.85 * innerWidth * innerHeight || !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) return;
        const s = getComputedStyle(el);
        const running = el.getAnimations().some((a) => a.playState === 'running');
        out[`${i} ${el.tagName} ${el.className}`] = [s.opacity, s.transform, s.filter, s.maskImage, running ? 'animating' : ''].join(' | ');
      });
      return out;
    });
  for (const u of [0.1, 0.3, 0.45, 0.5, 0.55, 0.7, 0.9]) {
    const t = SECTION_T.about * u;
    await scrollToT(page, t);
    // Mid-way, while the camera still eases toward t, so the crossing moves on between the two looks.
    await expect.poll(async () => Math.abs((await readout(page)).t - t), { timeout: 15_000 }).toBeLessThan(0.01);
    const before = await snapshot();
    await page.waitForTimeout(100);
    const after = await snapshot();
    const changing = Object.keys(after).filter((k) => before[k] !== after[k] || after[k].endsWith('animating'));
    expect(changing.length, `at u ${u}: ${changing.join(', ')}`).toBeLessThanOrEqual(3);
    for (const [k, v] of Object.entries(after)) {
      const [, , filter, mask] = v.split(' | ');
      expect(filter, `${k} at u ${u}`).toBe('none');
      if (changing.includes(k)) expect(mask, `${k} at u ${u}`).toBe('none');
    }
    await expect(page.locator('.scene canvas')).toHaveCSS('visibility', 'hidden');
  }
});

test('between the landing and About neither the dome and grid nor any section is ever drawn', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?fps');
  await waitForScene(page);
  const seen: number[] = [];
  const problems: string[] = [];
  for (let i = 0; i <= 20; i++) {
    const target = (SECTION_T.about * i) / 20;
    await scrollToT(page, target);
    await expect.poll(async () => Math.abs((await readout(page)).t - target), { timeout: 15_000 }).toBeLessThan(2e-3);
    const { t, opacity, drawn: domeDrawn } = await readout(page);
    seen.push(t);
    if (domeDrawn || opacity !== 0) problems.push(`dome ${opacity} ${domeDrawn ? 'drawn' : 'off'} at t ${t}`);
    for (const id of SECTION_IDS) if ((await drawn(page, id)) !== 0) problems.push(`${id} drawn at t ${t}`);
  }
  expect(problems).toEqual([]);
  expect(new Set(seen.map((t) => t.toFixed(3))).size).toBeGreaterThanOrEqual(15);
});

test("a world's effects below 0.05 of its weight are not displayed at all", async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  // At the landing the grove has no weight.
  for (const effect of ['.backdrop-mist-band', '.backdrop-light', '.backdrop-object-plane']) {
    await expect(grove(page).locator(effect)).toHaveCSS('display', 'none');
  }
  await expect(landing(page).locator('.backdrop-stars')).toHaveCSS('display', 'block');
  await scrollToSection(page, 'about');
  // At About the landing has none.
  for (const effect of ['.backdrop-stars', '.backdrop-mist-band']) {
    await expect(landing(page).locator(effect)).toHaveCSS('display', 'none', { timeout: 15_000 });
  }
  await expect(grove(page).locator('.backdrop-light')).toHaveCSS('display', 'block');
});

test("the grove's effects stop at weight 0, under an open page, and in a hidden tab", async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  const motion = () => grove(page).getAttribute('data-motion');
  const motes = grove(page).locator('.backdrop-mote');
  await expect(motes).toHaveCount(40);
  // At the landing the grove has no weight.
  expect(await motion()).toBe('stopped');
  await expect(motes.first()).toHaveCSS('animation-play-state', 'paused');
  await scrollToSection(page, 'about');
  await expect.poll(motion).toBe('running');
  await expect(motes.first()).toHaveCSS('animation-play-state', 'running');
  await expect(grove(page).locator('.backdrop-shimmer')).toHaveCSS('animation-play-state', 'running');
  await expect(stone(page).locator('.backdrop-object-light').first()).toHaveCSS('animation-play-state', 'running');

  await aboutMarker(page).click();
  await expect(page.locator('main.page')).toBeVisible();
  await expect.poll(motion).toBe('stopped');
  await expect(grove(page).locator('.backdrop-shimmer')).toHaveCSS('animation-play-state', 'paused');
  await page.goBack();
  await expectExploring(page);
  await expect.poll(motion).toBe('running');

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(motion).toBe('stopped');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(motion).toBe('running');

  await scrollToSection(page, 'projects');
  await expect.poll(motion, { timeout: 15_000 }).toBe('stopped');
});

test('turning on reduced motion mid-visit stills the grove; the glow holds soft', async ({ page }) => {
  // With reduced motion from the start the HTML site stands in, so it is turned on once the scene is up.
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'about');
  await expect(grove(page)).toHaveAttribute('data-motion', 'running');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(grove(page)).toHaveAttribute('data-motion', 'stopped');
  await expect(grove(page).locator('.backdrop-mote').first()).toHaveCSS('animation-name', 'none');
  await expect(grove(page).locator('.backdrop-shimmer')).toHaveCSS('animation-name', 'none');
  const light = stone(page).locator('.backdrop-object-light').first();
  await expect(light).toHaveCSS('animation-name', 'none');
  expect(Number(await light.evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0);
});

test('a world not yet decoded when the visitor reaches it shows as before it had a backdrop, and fades in once decoded', async ({ page }) => {
  const held: import('@playwright/test').Route[] = [];
  await page.route(/\/about-base-[\w-]+\.webp(\?.*)?$/, (route) => void held.push(route));
  await page.goto('/?fps');
  await waitForScene(page, { worlds: false });
  await scrollToSection(page, 'about');
  // The dome, the About grey box and its marker, as before the grove.
  await expect.poll(async () => (await readout(page)).drawn, { timeout: 15_000 }).toBe(true);
  await expect.poll(() => drawn(page, 'about')).toBe(1);
  await expect(aboutMarker(page)).toBeVisible();
  await expect(grove(page)).toHaveCSS('visibility', 'hidden');
  await expect(page.locator('.backdrop-hit')).toHaveCSS('visibility', 'hidden');
  expect(held.length).toBeGreaterThan(0);
  for (const route of held.splice(0)) await route.continue();
  await expect(grove(page)).toHaveAttribute('data-ready', '', { timeout: 15_000 });
  await expect(grove(page)).toHaveCSS('visibility', 'visible');
  await expect.poll(() => drawn(page, 'about')).toBe(0);
  await expect.poll(async () => (await readout(page)).drawn).toBe(false);
});

for (const [width, height] of [[390, 844], [1366, 768], [1920, 1080]]) {
  test.describe(`at ${width}x${height}`, () => {
    test.use({ viewport: { width, height } });

    test("the stone, its marker and the caption's text stand clear of one another, the whole stone in view", async ({ page }) => {
      await page.goto('/');
      await waitForScene(page);
      await scrollToSection(page, 'about');
      await expect(aboutMarker(page)).toBeVisible();
      const caption = page.locator('.caption').filter({ has: page.getByRole('heading', { name: 'About', exact: true }) });
      await expect(caption).toBeVisible();
      const overlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
        a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      const s = await box(stone(page));
      const m = await box(aboutMarker(page));
      expect(overlap(s, m)).toBe(false);
      // The caption's text itself, line by line, as laid out: each text node's line boxes, not its title's and lines'
      // block boxes, which run the caption's full width.
      const lines = await caption.evaluate((el) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const rects: { x: number; y: number; width: number; height: number }[] = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const r of range.getClientRects()) rects.push({ x: r.x, y: r.y, width: r.width, height: r.height });
        }
        return rects;
      });
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        expect(overlap(line, s), `caption line at ${line.x},${line.y}`).toBe(false);
        expect(overlap(line, m)).toBe(false);
      }
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x + s.width).toBeLessThanOrEqual(width);
      expect(s.y + s.height).toBeLessThanOrEqual(height);
    });
  });
}

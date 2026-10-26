import type { Page } from '@playwright/test';
import { PAGE_LABELS } from '../../src/content/scene';
import { PAGE_PATHS } from '../../src/routes';
import { SECTION_T } from '../../src/scene/cameraPath';
import { DUSK_VEIL_PEAK, MARKER_TOP_GUTTER_PX, NIGHTFALL, PROJECTS_PAN_T } from '../../src/scene/tuning';
import { MARKERS } from '../../src/sections/layouts';
import { expect, expectExploring, marker, scrollToSection, test, waitForScene } from './fixtures';

const city = (page: Page) => page.locator('.backdrop[data-zone="projects"]');
const building = (page: Page, key: string) => city(page).locator(`.backdrop-object[data-marker="${key}"]`);
const veil = (page: Page) => page.locator('.backdrop-veil');
const rain = (page: Page) => page.locator('.backdrop-rain-layer[data-zone="projects"]');
const sign = (page: Page, target: string) => city(page).locator(`.city-sign[data-marker="${target}"]`);
const box = async (locator: ReturnType<Page['locator']>) => (await locator.boundingBox())!;
/** A marker's own opacity: the Projects markers are 0 unless focused from the keyboard. */
const markerOpacity = (page: Page, label: string) => marker(page, label).evaluate((el) => Number(getComputedStyle(el).opacity));
/** How much the rain canvas holds: the sum of its pixels' alpha. */
const rainInk = (page: Page) =>
  page.locator('.backdrop-rain-layer[data-zone="projects"] canvas').evaluate((el: HTMLCanvasElement) => {
    const data = el.getContext('2d')!.getImageData(0, 0, el.width, el.height).data;
    let sum = 0;
    for (let i = 3; i < data.length; i += 4) sum += data[i];
    return sum;
  });
/** A fingerprint of the rain canvas's pixels now, to tell whether it changed. */
const rainFrame = (page: Page) =>
  page.locator('.backdrop-rain-layer[data-zone="projects"] canvas').evaluate((el: HTMLCanvasElement) => {
    const data = el.getContext('2d')!.getImageData(0, 0, el.width, el.height).data;
    let hash = 0;
    for (let i = 3; i < data.length; i += 4) hash = (hash * 31 + data[i] * (i + 1)) % 1_000_000_007;
    return hash;
  });

/** The projects, left to right as the city paints their buildings, with their page titles. */
const PROJECTS = MARKERS.filter((m) => m.section === 'projects').map((m) => ({ key: m.key, page: m.marker.page, label: PAGE_LABELS[m.marker.page] }));

/** Scrolls the window to path position t, as a visitor's scroll would. */
const scrollToT = (page: Page, t: number) =>
  page.evaluate((t) => window.scrollTo(0, Math.round(t * (document.documentElement.scrollHeight - innerHeight))), t);

/** A building's outline as the page has it (which pixels of its rect are solid). */
async function readOutline(page: Page, key: string) {
  return page.evaluate(async (key) => {
    const src = document.querySelector<HTMLElement>(`.backdrop[data-zone="projects"] .backdrop-object[data-marker="${key}"]`)!.dataset.outline!;
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const g = canvas.getContext('2d')!;
    g.drawImage(image, 0, 0);
    const data = g.getImageData(0, 0, canvas.width, canvas.height).data;
    const solid: number[] = [];
    for (let i = 0; i < data.length / 4; i++) solid.push(data[i * 4 + 3] >= 128 ? 1 : 0);
    return { width: canvas.width, height: canvas.height, solid };
  }, key);
}
type Outline = Awaited<ReturnType<typeof readOutline>>;

/** The view point over a pixel of a building's rect, by the box drawn over it. */
async function viewPoint(page: Page, key: string, outline: Outline, x: number, y: number) {
  const b = await box(building(page, key));
  return { x: b.x + ((x + 0.5) / outline.width) * b.width, y: b.y + ((y + 0.5) / outline.height) * b.height };
}

/** A pixel well inside a building's outline: the middle of its solid run on the row at `share` of its height. */
function inside(outline: Outline, share: number) {
  const y = Math.round(outline.height * share);
  const run: number[] = [];
  for (let x = 0; x < outline.width; x++) if (outline.solid[y * outline.width + x]) run.push(x);
  return { x: Math.round((run[0] + run[run.length - 1]) / 2), y };
}

/** The middle of a sign's lettering in the view: its text box's centre, or for the violet face its lettering's. */
async function signPoint(page: Page, target: string) {
  const b = await box(sign(page, target).locator('.city-sign-text').first());
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

for (const { key, page: target, label } of PROJECTS) {
  for (const on of ['building', 'sign'] as const) {
    test(`a press on the ${label} ${on} opens its page, with a pointer cursor over it`, async ({ page }) => {
      await page.goto('/');
      await waitForScene(page);
      await scrollToSection(page, 'projects');
      await expect(marker(page, label)).toBeAttached();
      let at: { x: number; y: number };
      if (on === 'sign') {
        at = await signPoint(page, target);
      } else {
        const outline = await readOutline(page, key);
        const p = inside(outline, 0.7);
        at = await viewPoint(page, key, outline, p.x, p.y);
      }
      await page.mouse.move(at.x, at.y);
      await expect
        .poll(() => page.evaluate(([x, y]) => getComputedStyle(document.elementFromPoint(x, y)!).cursor, [at.x, at.y] as const))
        .toBe('pointer');
      await page.mouse.click(at.x, at.y);
      await expect(page).toHaveURL(new RegExp(`${PAGE_PATHS[target]}$`));
      await expect(page.locator('main.page')).toBeVisible();
    });
  }
}

test('no Projects marker shows after hovering or pressing a building with the mouse; the other worlds keep theirs', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'about');
  await expect.poll(() => markerOpacity(page, PAGE_LABELS.about)).toBe(1);
  await scrollToSection(page, 'projects');
  for (const { key, label } of PROJECTS) {
    const outline = await readOutline(page, key);
    const p = inside(outline, 0.6);
    const at = await viewPoint(page, key, outline, p.x, p.y);
    await page.mouse.move(at.x, at.y);
    await expect(building(page, key)).toHaveAttribute('data-hover', '');
    for (const other of PROJECTS) expect(await markerOpacity(page, other.label), `${other.label} while over ${label}`).toBe(0);
  }
  // Pressed, then closed by its Back button: still none.
  const outline = await readOutline(page, 'attrition');
  const p = inside(outline, 0.6);
  const at = await viewPoint(page, 'attrition', outline, p.x, p.y);
  await page.mouse.click(at.x, at.y);
  await expect(page.locator('main.page')).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: 'Back' }).click();
  await expectExploring(page);
  for (const { label } of PROJECTS) {
    expect(await markerOpacity(page, label), label).toBe(0);
    expect(await marker(page, label).evaluate((el) => getComputedStyle(el).pointerEvents), label).toBe('none');
  }
  await scrollToSection(page, 'experience');
  await expect.poll(() => markerOpacity(page, 'DRDO')).toBe(1);
});

test('Tab reaches the five projects in order, each showing its marker and lighting its building; Enter opens it', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'projects');
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    if (await marker(page, PROJECTS[0].label).evaluate((el) => el === document.activeElement)) break;
  }
  for (const [i, { key, page: target, label }] of PROJECTS.entries()) {
    if (i > 0) await page.keyboard.press('Tab');
    await expect(marker(page, label)).toBeFocused();
    await expect.poll(() => markerOpacity(page, label), { message: label }).toBe(1);
    await expect(building(page, key)).toHaveAttribute('data-hover', '');
    await expect(sign(page, target)).toHaveAttribute('data-hover', '');
    for (const other of PROJECTS.filter((p) => p.key !== key)) {
      await expect(building(page, other.key)).not.toHaveAttribute('data-hover');
      expect(await markerOpacity(page, other.label), `${other.label} while ${label} has focus`).toBe(0);
    }
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${PAGE_PATHS[target]}$`));
    await expect(page.locator('main.page')).toBeVisible();
    await page.keyboard.press('Escape');
    await expectExploring(page);
    // Focus comes back to the marker, from the keyboard, so it shows again.
    await expect(marker(page, label)).toBeFocused();
  }
});

test('under the Projects caption: "Click a building" with a mouse', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'projects');
  const caption = page.locator('.caption').filter({ hasText: 'Projects' });
  const hint = caption.locator('.caption-hint');
  await expect(hint).toHaveText('Click a building', { useInnerText: true });
  await expect(hint.locator('[data-pointer="fine"]')).toBeVisible();
  await expect(hint.locator('[data-pointer="touch"]')).toBeHidden();
  // The caption's line style, under "3 completed · 2 in development".
  const lines = caption.locator('.caption-line');
  await expect(lines.nth(0)).toHaveText('3 completed · 2 in development');
  await expect(lines.nth(1)).toHaveText('Click a building', { useInnerText: true });
  const style = (i: number) => lines.nth(i).evaluate((el) => {
    const c = getComputedStyle(el);
    return [c.color, c.fontSize, c.fontWeight, c.fontFamily, c.marginTop];
  });
  expect(await style(1)).toEqual(await style(0));
  // Only Projects has one.
  await expect(page.locator('.caption-hint')).toHaveCount(1);
});

test('a press between the buildings, or inside one\'s rect but off its outline, opens nothing', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'projects');
  await expect(marker(page, PAGE_LABELS.attrition)).toBeVisible();
  const deco = await box(building(page, 'attrition'));
  const block = await box(building(page, 'unified-api-ingester'));
  // The open sky between the Art Deco tower and the steel block, above the block's crane.
  const between = { x: (deco.x + deco.width + block.x) / 2, y: block.y - 40 };
  // Inside the steel block's rect, over the sky above its counter-jib: off its outline.
  const outline = await readOutline(page, 'unified-api-ingester');
  expect(outline.solid[2 * outline.width + 2]).toBe(0);
  const offOutline = await viewPoint(page, 'unified-api-ingester', outline, 2, 2);
  for (const at of [between, offOutline]) {
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/#projects$/);
    await expectExploring(page);
  }
});

test('the markers pin over their buildings, above their tops or just below the menu bar, and follow them', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'projects');
  for (const [px, py] of [[0, 0], [1279, 719]]) {
    await page.mouse.move(px, py);
    await page.waitForTimeout(2_500);
    for (const { key, label } of PROJECTS) {
      const m = await box(marker(page, label));
      const b = await box(building(page, key));
      const centre = m.x + m.width / 2;
      expect(centre, label).toBeGreaterThanOrEqual(b.x - 1);
      expect(centre, label).toBeLessThanOrEqual(b.x + b.width + 1);
      // Above the building's top (within its top rows: the violet tower's top is its face, under its mast), or held
      // just below the menu bar where that top is near the view's top edge.
      expect(m.y + m.height <= b.y + 0.15 * b.height || m.y <= MARKER_TOP_GUTTER_PX + 0.5, label).toBe(true);
      expect(m.y, label).toBeGreaterThanOrEqual(MARKER_TOP_GUTTER_PX - 0.5);
    }
  }
});

test('names each project on its building exactly as its page title', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'projects');
  const signs = city(page).locator('.city-sign');
  await expect(signs).toHaveCount(PROJECTS.length);
  for (const { page: target, label } of PROJECTS) {
    const sign = city(page).locator(`.city-sign[data-marker="${target}"]`);
    await expect(sign).toHaveAttribute('data-name', label);
    const lines = await sign.locator('.city-sign-line').allTextContents();
    expect(lines.join('') === label || lines.join(' ') === label, `${lines} for ${label}`).toBe(true);
    await expect(sign).toBeVisible();
  }
});

test('hovering a building lights that building and its sign, and no other', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'projects');
  const outline = await readOutline(page, 'kanbanlight');
  const p = inside(outline, 0.6);
  const at = await viewPoint(page, 'kanbanlight', outline, p.x, p.y);
  await page.mouse.move(at.x, at.y);
  await expect(building(page, 'kanbanlight')).toHaveAttribute('data-hover', '');
  await expect(sign(page, 'kanbanlight')).toHaveAttribute('data-hover', '');
  const light = building(page, 'kanbanlight').locator('.backdrop-object-light-hover');
  await expect.poll(async () => Number(await light.evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0.3);
  for (const other of PROJECTS.filter((p) => p.key !== 'kanbanlight')) await expect(building(page, other.key)).not.toHaveAttribute('data-hover');
  await page.mouse.move(5, 500);
  await expect(building(page, 'kanbanlight')).not.toHaveAttribute('data-hover');
});

for (const [width, height] of [[1920, 1080], [1366, 768]]) {
  test.describe(`at ${width}x${height}`, () => {
    test.use({ viewport: { width, height } });

    test('each spire shows at least one aviation light in view, clear of every marker', async ({ page }) => {
      await page.goto('/');
      await waitForScene(page);
      await scrollToSection(page, 'projects');
      await page.waitForTimeout(1_000);
      const lights = await city(page).locator('.city-beacon').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
      // Only markers that show: the Projects ones don't unless focused.
      const markers = await page
        .locator('button.marker:visible')
        .evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity !== '0').map((el) => el.getBoundingClientRect().toJSON()));
      const clear = (l: DOMRect) =>
        l.top >= 0 && l.left >= 0 && l.right <= width && l.bottom <= height &&
        markers.every((m: DOMRect) => l.right <= m.left || l.left >= m.right || l.bottom <= m.top || l.top >= m.bottom);
      // In `BEACONS` order: the two crane tops, the Art Deco spire's two, the violet mast's two.
      expect(clear(lights[2]) || clear(lights[3]), 'Art Deco spire').toBe(true);
      expect(clear(lights[4]) || clear(lights[5]), 'violet mast').toBe(true);
      expect(clear(lights[0]), 'first crane').toBe(true);
      expect(clear(lights[1]), 'second crane').toBe(true);
    });
  });
}

test('the grey Projects boxes are not drawn over the city', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'projects');
  await expect.poll(async () => Number(await page.locator('.scene canvas:not(.backdrop-rain)').getAttribute('data-section-projects'))).toBe(0);
});

test("the city's life runs at Projects and stops at weight 0 and under a page", async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'projects');
  await expect(city(page)).toHaveAttribute('data-motion', 'running');
  await expect(city(page)).toHaveAttribute('data-effects', 'on');
  // The rain is drops on one canvas, drawn anew each frame; the old tiled sheets are gone.
  await expect(rain(page).locator('canvas')).toHaveCount(1);
  await expect(rain(page).locator('div')).toHaveCount(0);
  await expect.poll(() => rainInk(page)).toBeGreaterThan(0);
  const first = await rainFrame(page);
  await expect.poll(() => rainFrame(page)).not.toBe(first);
  await scrollToSection(page, 'experience');
  await expect(city(page)).toHaveAttribute('data-motion', 'stopped');
  await expect(city(page)).toHaveAttribute('data-effects', 'off');
  await expect(rain(page)).toBeHidden();
  await scrollToSection(page, 'projects');
  await expect(city(page)).toHaveAttribute('data-motion', 'running');
  const at = await signPoint(page, 'datavista');
  await page.mouse.click(at.x, at.y);
  await expect(page.locator('main.page')).toBeVisible();
  await expect(city(page)).toHaveAttribute('data-motion', 'stopped');
  expect(await city(page).locator('.city-beacon').first().evaluate((el) => getComputedStyle(el).animationPlayState)).toBe('paused');
  // Under the page the rain holds its last frame.
  await expect(rain(page)).toHaveAttribute('data-motion', 'stopped');
  const held = await rainFrame(page);
  await page.waitForTimeout(500);
  expect(await rainFrame(page)).toBe(held);
});

test('the city holds still once reduced motion is turned on mid-visit (a visit that starts with it gets the HTML site)', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'projects');
  await expect(city(page)).toHaveAttribute('data-motion', 'running');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(city(page)).toHaveAttribute('data-motion', 'stopped');
  // No falling drops: the rain's canvas is left clear.
  await expect.poll(() => rainInk(page)).toBe(0);
  for (const selector of ['.city-hanging', '.city-led-band', '.city-window', '.city-beacon']) {
    expect(await city(page).locator(selector).first().evaluate((el) => getComputedStyle(el).animationName), selector).toBe('none');
  }
});

test('the nightfall: the grade, the veil and the lights at 0 at both stops, each stage in turn between them', async ({ page }) => {
  await page.goto('/?fps');
  await waitForScene(page);
  const shown = (locator: ReturnType<Page['locator']>) => async () =>
    (await locator.evaluate((el) => el.style.visibility)) === 'visible' ? Number(await locator.evaluate((el) => el.style.opacity)) : 0;
  const grades = page.locator('.backdrop-grade');
  const lights = page.locator('.backdrop-lights');
  const all = [veil(page), grades.nth(0), grades.nth(1), lights];
  const at = (u: number) => SECTION_T.about + (SECTION_T.projects - SECTION_T.about) * u;
  await scrollToSection(page, 'about');
  for (const layer of all) await expect.poll(shown(layer)).toBe(0);
  // Sunset: the warm grade, then the magenta.
  await scrollToT(page, at(0.12));
  await expect.poll(shown(grades.nth(0)), { timeout: 15_000 }).toBeGreaterThan(0.2);
  await scrollToT(page, at(0.32));
  await expect.poll(shown(grades.nth(1)), { timeout: 15_000 }).toBeGreaterThan(0.3);
  // Dusk: the veil at its peak halfway, the 3D canvas off under it, no dawn bloom.
  await scrollToT(page, at(0.5));
  await expect.poll(shown(veil(page)), { timeout: 15_000 }).toBeGreaterThan(DUSK_VEIL_PEAK - 0.02);
  await expect
    .poll(async () => /dome [\d.]+ \(path [\d.]+\) (drawn|off)/.exec((await page.locator('[data-readout="backdrop"]').textContent()) ?? '')?.[1])
    .toBe('off');
  await expect(page.locator('.scene canvas:not(.backdrop-rain)')).toHaveCSS('visibility', 'hidden');
  await expect(page.locator('.backdrop-bloom')).toHaveCSS('visibility', 'hidden');
  await expect.poll(shown(lights)).toBe(0);
  // The rain, then the city's lights, in the dark: the veil still up.
  await scrollToT(page, at((NIGHTFALL.lights.rise[1] + NIGHTFALL.veil.fall[0]) / 2));
  await expect.poll(shown(lights), { timeout: 15_000 }).toBeGreaterThan(0.5);
  await expect.poll(shown(rain(page))).toBeGreaterThan(0.5);
  expect(await shown(veil(page))()).toBeGreaterThan(0.5);
  await scrollToSection(page, 'projects');
  for (const layer of all) await expect.poll(shown(layer)).toBe(0);
  await expect.poll(shown(rain(page))).toBe(1);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('the Projects stop pans the city to bring each building into view in turn, left to right', async ({ page }) => {
    await page.goto('/');
    await waitForScene(page);
    await scrollToSection(page, 'projects');
    for (const [i, { key, label }] of PROJECTS.entries()) {
      await scrollToT(page, PROJECTS_PAN_T[0] + ((PROJECTS_PAN_T[1] - PROJECTS_PAN_T[0]) * i) / (PROJECTS.length - 1));
      await expect
        .poll(async () => {
          const b = await box(building(page, key));
          const middle = b.x + b.width / 2;
          return Math.abs(middle - 195) < 4 || (b.x >= -2 && b.x + b.width <= 392);
        }, { message: label, timeout: 15_000 })
        .toBe(true);
      await expect(marker(page, label)).toBeVisible();
      // The marker over its building.
      const m0 = await box(marker(page, label));
      const b0 = await box(building(page, key));
      expect(m0.x + m0.width / 2, label).toBeGreaterThanOrEqual(b0.x - 1);
      expect(m0.x + m0.width / 2, label).toBeLessThanOrEqual(b0.x + b0.width + 1);
      // Nothing over the caption.
      const caption = await box(page.locator('.caption').filter({ hasText: 'Projects' }));
      const m = await box(marker(page, label));
      expect(m.y + m.height <= caption.y || m.x >= caption.x + caption.width, label).toBe(true);
    }
  });
});

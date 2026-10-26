import type { Page } from '@playwright/test';
import { PAGE_LABELS } from '../../src/content/scene';
import { MARKERS } from '../../src/sections/layouts';
import { expect, marker, scrollToSection, test, waitForScene } from './fixtures';

const city = (page: Page) => page.locator('.backdrop[data-zone="projects"]');
const building = (page: Page, key: string) => city(page).locator(`.backdrop-object[data-marker="${key}"]`);
const PROJECTS = MARKERS.filter((m) => m.section === 'projects').map((m) => ({ key: m.key, label: PAGE_LABELS[m.marker.page] }));

/** Each building's outline pixels in the view, sampled every few px of its outline: [x, y] in device px. */
async function outlinePoints(page: Page, key: string, step = 6) {
  return page.evaluate(
    async ([key, step]) => {
      const el = document.querySelector<HTMLElement>(`.backdrop[data-zone="projects"] .backdrop-object[data-marker="${key}"]`)!;
      const image = new Image();
      image.src = el.dataset.outline!;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const g = canvas.getContext('2d')!;
      g.drawImage(image, 0, 0);
      const data = g.getImageData(0, 0, canvas.width, canvas.height).data;
      const b = el.getBoundingClientRect();
      const points: [number, number][] = [];
      // Two px in from the outline's edge, so the light's own edge doesn't count.
      const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < canvas.width && y < canvas.height && data[(y * canvas.width + x) * 4 + 3] >= 128;
      for (let y = 2; y < canvas.height; y += step) {
        for (let x = 2; x < canvas.width; x += step) {
          if (![[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]].every(([dx, dy]) => solid(x + dx, y + dy))) continue;
          const vx = Math.round(b.x + ((x + 0.5) / canvas.width) * b.width);
          const vy = Math.round(b.y + ((y + 0.5) / canvas.height) * b.height);
          if (vx >= 0 && vy >= 0 && vx < innerWidth && vy < innerHeight) points.push([vx, vy]);
        }
      }
      return points;
    },
    [key, step] as const,
  );
}

/** The page as it shows now, as RGBA over the view: passed back as base64 of the raw bytes, not as an array of
 *  numbers, which at 1920x1080 is too large for the test process. */
async function pixels(page: Page) {
  const png = (await page.screenshot()).toString('base64');
  const { width, raw } = await page.evaluate(async (png) => {
    const image = new Image();
    image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const g = canvas.getContext('2d')!;
    g.drawImage(image, 0, 0);
    const data = g.getImageData(0, 0, canvas.width, canvas.height).data;
    let raw = '';
    for (let i = 0; i < data.length; i += 0x8000) raw += String.fromCharCode(...data.subarray(i, i + 0x8000));
    return { width: canvas.width, raw: btoa(raw) };
  }, png);
  const text = atob(raw);
  const data = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) data[i] = text.charCodeAt(i);
  return { width, data };
}
type Pixels = Awaited<ReturnType<typeof pixels>>;
const luma = ({ width, data }: Pixels, [x, y]: [number, number]) => {
  const i = (y * width + x) * 4;
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
};
const mean = (p: Pixels, points: [number, number][]) => points.reduce((s, q) => s + luma(p, q), 0) / points.length;

test.describe('at 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('hovering each building brightens inside its outline and nowhere else; nothing on the violet tower gets darker', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await waitForScene(page);
    await scrollToSection(page, 'projects');
    // Everything holds still (rain, pulse, wave, windows), so two shots differ only by the hover.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Parked over open sky between the towers: over any building it would light that one in the shot at rest.
    await page.mouse.move(1250, 200);
    await page.waitForTimeout(1_500);
    const outlines = Object.fromEntries(await Promise.all(PROJECTS.map(async ({ key }) => [key, await outlinePoints(page, key)] as const)));
    // Markers and their own hover style are left out.
    const markerBoxes = await page.locator('button.marker:visible').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
    const clear = ([x, y]: [number, number]) => markerBoxes.every((m: DOMRect) => x < m.left - 4 || x > m.right + 4 || y < m.top - 4 || y > m.bottom + 4);
    for (const key of Object.keys(outlines)) outlines[key] = outlines[key].filter(clear);
    // The sky well away from every building, where no glow reaches.
    const sky: [number, number][] = [[700, 140], [1250, 200], [1350, 300]];
    const rest = await pixels(page);
    for (const { key, label } of PROJECTS) {
      await marker(page, label).focus();
      await expect(building(page, key)).toHaveAttribute('data-hover', '');
      await page.waitForTimeout(400);
      const lit = await pixels(page);
      const own = mean(lit, outlines[key]) - mean(rest, outlines[key]);
      expect(own, `${label} brightens`).toBeGreaterThan(8);
      for (const other of PROJECTS.filter((p) => p.key !== key)) {
        expect(Math.abs(mean(lit, outlines[other.key]) - mean(rest, outlines[other.key])), `${other.label} while ${label}`).toBeLessThan(1);
      }
      for (const point of sky) expect(Math.abs(luma(lit, point) - luma(rest, point)), `sky at ${point}`).toBeLessThan(1.5);
      if (key === 'neuroinsight-ai') {
        let darkest = 0;
        for (const point of await outlinePoints(page, key, 2)) {
          if (!clear(point)) continue;
          const i = (point[1] * lit.width + point[0]) * 4;
          for (let c = 0; c < 3; c++) darkest = Math.min(darkest, lit.data[i + c] - rest.data[i + c]);
        }
        // To a level of rounding in compositing.
        expect(darkest, 'darkest change of a channel inside the violet tower').toBeGreaterThanOrEqual(-2);
      }
      await page.locator('body').evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await expect(building(page, key)).not.toHaveAttribute('data-hover');
      await page.waitForTimeout(200);
    }
  });
});

test('the light fades in over about 0.3 s and out over about 0.5 s', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'projects');
  const light = building(page, 'attrition').locator('.backdrop-object-light');
  // Over the middle of the tower's outline.
  const points = await outlinePoints(page, 'attrition', 12);
  const [x, y] = points[Math.floor(points.length / 2)];
  await page.mouse.move(x, y);
  await expect.poll(() => light.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0.3s');
  await expect.poll(async () => Number(await light.evaluate((el) => getComputedStyle(el).opacity))).toBe(1);
  await page.mouse.move(960, 715);
  await expect.poll(() => light.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0.5s');
  await expect.poll(async () => Number(await light.evaluate((el) => getComputedStyle(el).opacity))).toBe(0);
});

for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
  test.describe(`marker labels at ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, ...(width < 500 ? { isMobile: true, hasTouch: true } : {}) });

    test('sit below the menu bar, inside the view, on two lines at most', async ({ page }) => {
      await page.goto('/');
      await waitForScene(page);
      await scrollToSection(page, 'projects');
      const menu = await page.locator('.menu').evaluate((el) => el.getBoundingClientRect().bottom);
      // On a phone the city pans across its buildings; there a marker shows only while its building is in view.
      let checked = 0;
      for (const { label } of PROJECTS) {
        const m = marker(page, label);
        if (!(await m.isVisible())) continue;
        const r = await m.evaluate((el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          const tops = new Set(Array.from(range.getClientRects()).map((rect) => Math.round(rect.top)));
          return { ...el.getBoundingClientRect().toJSON(), lines: tops.size };
        });
        expect(r.top, label).toBeGreaterThanOrEqual(menu);
        expect(r.left, label).toBeGreaterThanOrEqual(0);
        expect(r.right, label).toBeLessThanOrEqual(width);
        expect(r.lines, label).toBeLessThanOrEqual(2);
        checked++;
      }
      expect(checked).toBeGreaterThan(0);
    });
  });
}

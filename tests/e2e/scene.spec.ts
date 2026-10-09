import type { Page } from '@playwright/test';
import { content as datavista } from '../../src/content/pages/datavista';
import { SECTION_TITLES } from '../../src/content/scene';
import { PAGE_PATHS } from '../../src/routes';
import { SECTION_IDS, type SectionId } from '../../src/sections/contract';
import {
  audioContexts,
  caption,
  COUNT_AUDIO_CONTEXTS,
  expect,
  expectExploring,
  marker,
  scrollToSection,
  test,
  waitForScene,
} from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);
});

test('scrolling passes through every section in order', async ({ page }) => {
  await expect(page.locator('.landing')).toBeVisible();
  for (const id of SECTION_IDS) await scrollToSection(page, id);
});

test('the menu travels to each section', async ({ page }) => {
  // Travel is at walking pace, up to 12 s per trip.
  test.setTimeout(180_000);
  // Back and forth along the whole path, so every section is reached from both directions at least once.
  const order: SectionId[] = [...SECTION_IDS, 'about', 'contact', 'projects'];
  for (const id of order) {
    await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: SECTION_TITLES[id], exact: true }).click();
    // The hash is set once the travel arrives.
    await expect(page).toHaveURL(new RegExp(`/#${id}$`), { timeout: 20_000 });
    await expect(caption(page, id)).toBeVisible();
  }
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Vardaan', exact: true }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
  await expect(page.locator('.landing')).toBeVisible();
});

const PROJECTS = [
  ['DataVista', 'datavista'],
  ['NeuroInsight-AI', 'neuroinsight-ai'],
  ['Employee Attrition Analysis', 'attrition'],
  ['KanbanLight', 'kanbanlight'],
  ['Unified API Ingester', 'unified-api-ingester'],
] as const;

test('each project box opens its own page, and Back returns to the path', async ({ page }) => {
  await scrollToSection(page, 'projects');
  for (const [label, id] of PROJECTS) {
    await marker(page, label).click();
    await expect(page).toHaveURL(PAGE_PATHS[id]);
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(label);
    // Opaque and full-viewport once open: the scene layer is hidden behind it.
    await expect(page.locator('.scene')).toHaveClass(/scene-hidden/);
    await main.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/#projects$/);
    await expectExploring(page);
    // Focus returns to the marker that opened the page.
    await expect(marker(page, label)).toBeFocused();
  }
});

const PANELS = [
  ['DRDO', 'experience'],
  ['AgryBin', 'experience'],
  ['Web Page Linker', 'publications'],
] as const;

async function openPanel(page: Page, label: string) {
  await marker(page, label).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { level: 2 })).toBeFocused();
  return dialog;
}

for (const [label, section] of PANELS) {
  test(`${label} opens a panel that closes by Close, Escape, an outside click and Back`, async ({ page }) => {
    await scrollToSection(page, section);
    const url = page.url();

    let dialog = await openPanel(page, label);
    // The URL doesn't change for a panel.
    expect(page.url()).toBe(url);
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expectExploring(page);
    expect(page.url()).toBe(url);

    await openPanel(page, label);
    await page.keyboard.press('Escape');
    await expectExploring(page);

    dialog = await openPanel(page, label);
    // Left edge of the viewport: the scene, beside the panel.
    const box = (await dialog.boundingBox())!;
    await page.mouse.click(Math.max(4, box.x / 4), box.y + box.height / 2);
    await expectExploring(page);

    await openPanel(page, label);
    await page.goBack();
    await expectExploring(page);
    expect(page.url()).toBe(url);
  });
}

test('opening and closing a page keeps the scroll position and the same canvas', async ({ page }) => {
  await scrollToSection(page, 'projects');
  const canvas = await page.locator('.scene canvas').elementHandle();
  const scrollY = await page.evaluate(() => window.scrollY);
  await marker(page, 'KanbanLight').click();
  await expect(page.getByRole('main')).toBeVisible();
  await page.goBack();
  await expectExploring(page);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  expect(await page.evaluate((c) => c === document.querySelector('.scene canvas'), canvas)).toBe(true);
});

test('closing a panel returns focus to its marker', async ({ page }) => {
  await scrollToSection(page, 'experience');
  await openPanel(page, 'DRDO');
  await page.keyboard.press('Escape');
  await expectExploring(page);
  await expect(marker(page, 'DRDO')).toBeFocused();
});

test('the FPS readout loads only with ?fps', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));
  await scrollToSection(page, 'about');
  expect(requested.filter((url) => url.includes('FpsReadout'))).toEqual([]);
  await page.goto('/?fps');
  await waitForScene(page);
  await expect.poll(() => requested.some((url) => url.includes('FpsReadout'))).toBe(true);
});

test("a page's code is not requested before it opens", async ({ page }) => {
  const bodies: string[] = [];
  page.on('response', async (response) => {
    if (response.url().endsWith('.js')) bodies.push(await response.text().catch(() => ''));
  });
  await scrollToSection(page, 'projects');
  // The scene has loaded and settled at Projects; DataVista's content is still nowhere in what was fetched.
  const hasSummary = () => bodies.some((body) => body.includes(datavista.summary.slice(0, 60)));
  expect(hasSummary()).toBe(false);
  await marker(page, 'DataVista').click();
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('DataVista');
  expect(hasSummary()).toBe(true);
});

test('no AudioContext exists before the first press', async ({ page }) => {
  await page.addInitScript(COUNT_AUDIO_CONTEXTS);
  await page.goto('/');
  await waitForScene(page);
  // Wheel scrolling and hovering are not presses.
  await page.mouse.move(640, 360);
  await page.mouse.wheel(0, 2000);
  // Let the wheel's smooth scroll finish, so it can't carry on past the section scrolled to next.
  await expect.poll(async () => {
    const before = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(200);
    return (await page.evaluate(() => window.scrollY)) === before && before > 0;
  }).toBe(true);
  await scrollToSection(page, 'projects');
  await marker(page, 'DataVista').hover();
  expect(await audioContexts(page)).toBe(0);
  await marker(page, 'DataVista').click();
  await expect(page.getByRole('main')).toBeVisible();
  expect(await audioContexts(page)).toBe(1);
});

test('no AudioContext is ever created when muted was saved', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('muted', 'true'));
  await page.addInitScript(COUNT_AUDIO_CONTEXTS);
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'projects');
  await marker(page, 'DataVista').click();
  await expect(page.getByRole('main')).toBeVisible();
  await page.keyboard.press('Escape');
  await expectExploring(page);
  expect(await audioContexts(page)).toBe(0);
});

test('a lost WebGL context switches the visit to the HTML site', async ({ page }) => {
  await page.addInitScript(COUNT_AUDIO_CONTEXTS);
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'experience');
  await page.locator('.scene canvas').evaluate((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    gl!.getExtension('WEBGL_lose_context')!.loseContext();
  });
  await expect(page.getByRole('heading', { level: 1, name: 'Vardaan' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveClass(/scroll-locked/);
  // The hash still names the section the visitor was at.
  await expect(page.locator('#experience')).toBeInViewport();
  // Sound is gone with the scene: a press creates nothing.
  await page.getByRole('link', { name: 'Experience', exact: true }).last().click();
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Experience');
  expect(await audioContexts(page)).toBe(0);
});

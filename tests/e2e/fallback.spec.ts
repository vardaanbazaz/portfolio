import type { Page } from '@playwright/test';
import { content as publications } from '../../src/content/pages/publications';
import { PAGE_LABELS, SECTION_TITLES } from '../../src/content/scene';
import { PAGE_IDS } from '../../src/pages/contract';
import { PAGE_PATHS } from '../../src/routes';
import { SECTION_IDS } from '../../src/sections/contract';
import { audioContexts, COUNT_AUDIO_CONTEXTS, expect, test } from './fixtures';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

/** Collects every script the page fetched, to search for 3D code by content rather than by chunk name. */
function collectScripts(page: Page) {
  const bodies: string[] = [];
  page.on('response', async (response) => {
    if (response.request().resourceType() === 'script') bodies.push(await response.text().catch(() => ''));
  });
  return bodies;
}

const has3dCode = (bodies: string[]) => bodies.some((body) => body.includes('WebGLRenderer') || body.includes('WebGLRenderTarget'));

test('with reduced motion, the HTML site shows and no 3D code is requested', async ({ page }) => {
  const scripts = collectScripts(page);
  await page.addInitScript(COUNT_AUDIO_CONTEXTS);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Vardaan' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);

  for (const id of SECTION_IDS) await expect(page.getByRole('heading', { level: 2, name: SECTION_TITLES[id], exact: true })).toBeVisible();
  for (const id of PAGE_IDS) await expect(page.locator(`a[href="${PAGE_PATHS[id]}"]`)).toHaveText(PAGE_LABELS[id]);

  // Web Page Linker has no page; the home carries its citation and summary.
  const linker = publications.citations[0];
  await expect(page.getByRole('heading', { level: 3, name: linker.title })).toBeVisible();
  await expect(page.getByText(linker.summary)).toBeVisible();
  await expect(page.locator(`a[href="https://doi.org/${linker.doi}"]`)).toBeVisible();

  // Every page opens as a normal document.
  for (const id of PAGE_IDS) {
    await page.locator(`a[href="${PAGE_PATHS[id]}"]`).click();
    await expect(page).toHaveURL(PAGE_PATHS[id]);
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(PAGE_LABELS[id]);
    await expect(page).toHaveTitle(`${PAGE_LABELS[id]} · Vardaan`);
    await page.getByRole('link', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/#[a-z]+$/);
  }

  expect(has3dCode(scripts)).toBe(false);
  // No sound in the HTML site: the presses above created nothing.
  expect(await audioContexts(page)).toBe(0);
  await expect(page.getByRole('button', { name: 'Mute' })).toHaveCount(0);
});

test('with reduced motion, a direct page link shows that page', async ({ page }) => {
  const scripts = collectScripts(page);
  await page.goto('/projects/attrition');
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Employee Attrition Analysis');
  await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', 'Computer vision · full-stack web · C/DSP systems');
  expect(has3dCode(scripts)).toBe(false);
});

test('the scene build does contain the 3D code this check looks for', async ({ browser }) => {
  // Guards the check above: with reduced motion off, the same search must find three.js.
  const context = await browser.newContext({ reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const scripts = collectScripts(page);
  await page.goto('/');
  await expect(page.locator('.scene canvas')).toBeAttached({ timeout: 20_000 });
  expect(has3dCode(scripts)).toBe(true);
  await context.close();
});

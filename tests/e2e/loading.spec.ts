import type { Page } from '@playwright/test';
import { content as about } from '../../src/content/pages/about';
import { content as attrition } from '../../src/content/pages/attrition';
import { content as contact } from '../../src/content/pages/contact';
import { content as datavista } from '../../src/content/pages/datavista';
import { content as experience } from '../../src/content/pages/experience';
import { content as ingester } from '../../src/content/pages/unified-api-ingester';
import { content as kanbanlight } from '../../src/content/pages/kanbanlight';
import { content as neuroinsight } from '../../src/content/pages/neuroinsight-ai';
import { content as publications } from '../../src/content/pages/publications';
import { PAGE_PATHS } from '../../src/routes';
import {
  chunkPattern,
  expect,
  expectExploring,
  holdChunks,
  loadingScreen,
  marker,
  PAGE_CHUNKS,
  PANEL_CHUNKS,
  scrollToSection,
  test,
  waitForScene,
} from './fixtures';

/** One piece of each page's content, free of quotes the minifier might escape. Panels show the Experience and
 *  Publications content. */
const CONTENT = {
  about: about.education.institution,
  datavista: datavista.summary.slice(12, 60),
  'neuroinsight-ai': neuroinsight.summary.slice(12, 60),
  attrition: attrition.summary.slice(12, 60),
  kanbanlight: kanbanlight.summary.slice(12, 60),
  'unified-api-ingester': ingester.summary.slice(12, 60),
  experience: experience.roles[0].points[0],
  publications: publications.writeUp.summary.slice(12, 60),
  contact: contact.email,
};

/** Every script the page fetched: its URL, and its text once it has arrived. */
function collectScripts(page: Page) {
  const scripts: { url: string; body: string }[] = [];
  page.on('response', async (response) => {
    if (response.request().resourceType() !== 'script') return;
    const script = { url: response.url(), body: '' };
    scripts.push(script);
    script.body = await response.text().catch(() => '');
  });
  return {
    contentFound: () => Object.entries(CONTENT).filter(([, text]) => scripts.some((s) => s.body.includes(text))).map(([id]) => id),
    chunksFetched: (names: string[]) => names.filter((name) => scripts.some((s) => chunkPattern(name).test(s.url))),
  };
}

const ALL_CONTENT = Object.keys(CONTENT);
/** Experience's short content is the one exception: the scene shows it in its caption (see `src/content/scene.ts`). */
const HELD_BACK = ALL_CONTENT.filter((id) => id !== 'experience');

test('page content is not in the first download, and every page and panel is fetched once the scene code is in', async ({ page }) => {
  const scripts = collectScripts(page);
  const chunks = await holdChunks(page, [...PAGE_CHUNKS, ...PANEL_CHUNKS]);
  await page.goto('/');
  // The scene has drawn, and the background fetch has asked for its first chunk, which is held back.
  await expect(loadingScreen(page)).toHaveAttribute('data-drawn', '', { timeout: 20_000 });
  await expect.poll(chunks.requested).toBeGreaterThan(0);

  expect(scripts.contentFound().filter((id) => HELD_BACK.includes(id))).toEqual([]);
  expect(scripts.chunksFetched([...PAGE_CHUNKS, ...PANEL_CHUNKS])).toEqual([]);

  await chunks.release();
  await expect.poll(() => scripts.chunksFetched([...PAGE_CHUNKS, ...PANEL_CHUNKS])).toEqual([...PAGE_CHUNKS, ...PANEL_CHUNKS]);
  // The content searched for above really is in the chunks, so its absence before meant something.
  await expect.poll(() => scripts.contentFound()).toEqual(ALL_CONTENT);
});

test('a direct page link also fetches every page and panel in the background', async ({ page }) => {
  const scripts = collectScripts(page);
  await page.goto(PAGE_PATHS.attrition);
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Employee Attrition Analysis');
  await expect.poll(() => scripts.chunksFetched([...PAGE_CHUNKS, ...PANEL_CHUNKS])).toEqual([...PAGE_CHUNKS, ...PANEL_CHUNKS]);
});

test('once the background fetch is done, opening a page or a panel makes no new request', async ({ page }) => {
  const scripts = collectScripts(page);
  await page.goto('/');
  await waitForScene(page);
  await expect.poll(() => scripts.chunksFetched([...PAGE_CHUNKS, ...PANEL_CHUNKS])).toEqual([...PAGE_CHUNKS, ...PANEL_CHUNKS]);
  await page.waitForLoadState('networkidle');

  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));

  await scrollToSection(page, 'projects');
  await marker(page, 'DataVista').click();
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('DataVista');
  await page.keyboard.press('Escape');
  await expectExploring(page);

  await scrollToSection(page, 'experience');
  await marker(page, 'DRDO').click();
  await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toBeFocused();

  expect(requested).toEqual([]);
});

test('a page whose chunk fails to load says so, and loads when Try again is pressed', async ({ page }) => {
  const failing = chunkPattern('DataVistaPage');
  let failures = 0;
  await page.route(failing, (route) => {
    failures++;
    return route.abort();
  });

  const scripts = collectScripts(page);
  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'projects');
  // The background fetch gave up on it after three tries and went on to the last chunk; opening it tries again.
  await expect.poll(() => scripts.chunksFetched(['CitationPanel'])).toEqual(['CitationPanel']);
  expect(failures).toBe(3);
  const before = failures;
  await marker(page, 'DataVista').click();

  const main = page.getByRole('main');
  await expect(main.getByRole('alert')).toHaveText(/Couldn't load this page\./);
  await expect(main.getByRole('status')).toHaveCount(0);
  // Fetched again twice more after the first failure.
  expect(failures - before).toBe(3);
  const retry = main.getByRole('button', { name: 'Try again' });
  await expect(retry).toBeFocused();

  await page.unroute(failing);
  await retry.click();
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('DataVista');
  await expect(main.getByRole('alert')).toHaveCount(0);
  await expect(page).toHaveURL(PAGE_PATHS.datavista);
});

test('a page whose content chunk fails to load recovers when Try again is pressed', async ({ page }) => {
  // The page's content is a chunk of its own, which the page's chunk imports. The browser may keep that failure for
  // the rest of the visit, in which case Try again reloads the document; either way the page must come back.
  const failing = chunkPattern('datavista');
  await page.route(failing, (route) => route.abort());

  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'projects');
  await marker(page, 'DataVista').click();

  const main = page.getByRole('main');
  await expect(main.getByRole('alert')).toHaveText(/Couldn't load this page\./);

  await page.unroute(failing);
  await main.getByRole('button', { name: 'Try again' }).click();
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('DataVista', { timeout: 20_000 });
  await expect(page).toHaveURL(PAGE_PATHS.datavista);
});

test('a panel whose chunk fails to load says so, and loads when Try again is pressed', async ({ page }) => {
  const failing = chunkPattern('CitationPanel');
  await page.route(failing, (route) => route.abort());

  await page.goto('/');
  await waitForScene(page);
  await scrollToSection(page, 'publications');
  await marker(page, 'Web Page Linker').click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toHaveText(/Couldn't load this page\./);

  await page.unroute(failing);
  await dialog.getByRole('button', { name: 'Try again' }).click();
  await expect(dialog.getByRole('heading', { level: 2 })).toBeFocused();
});

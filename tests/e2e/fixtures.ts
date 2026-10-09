import { test as base, expect, type Page, type Route } from '@playwright/test';
import { SECTION_TITLES } from '../../src/content/scene';
import { SECTION_T } from '../../src/scene/cameraPath';
import type { SectionId } from '../../src/sections/contract';

/** Every test also checks that the page requested nothing from anywhere but the site itself. */
export const test = base.extend<{ outsideRequests: string[] }>({
  outsideRequests: [
    async ({ page, baseURL }, use) => {
      const outside: string[] = [];
      page.on('request', (request) => {
        const url = request.url();
        if (!url.startsWith(baseURL!) && !url.startsWith('data:') && !url.startsWith('blob:')) outside.push(url);
      });
      await use(outside);
      expect(outside, 'requests to other servers').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Counts AudioContexts the page creates, from before any of its scripts run. */
export const COUNT_AUDIO_CONTEXTS = () => {
  const w = window as unknown as { audioContexts: number; AudioContext: typeof AudioContext };
  w.audioContexts = 0;
  const Original = w.AudioContext;
  w.AudioContext = class extends Original {
    constructor(options?: AudioContextOptions) {
      super(options);
      w.audioContexts++;
    }
  };
};

export const audioContexts = (page: Page) => page.evaluate(() => (window as unknown as { audioContexts: number }).audioContexts);

/** Scrolls the window to a section's point on the path, as a visitor's scroll would, and waits for the camera. */
export async function scrollToSection(page: Page, id: SectionId) {
  await page.evaluate((t) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.round(t * max));
  }, SECTION_T[id]);
  await expect(page).toHaveURL(new RegExp(`/#${id}$`));
  await expect(caption(page, id)).toBeVisible();
}

export const caption = (page: Page, id: SectionId) =>
  page.locator('.caption').filter({ has: page.getByRole('heading', { name: SECTION_TITLES[id], exact: true }) });

export const marker = (page: Page, label: string) => page.locator('button.marker', { hasText: new RegExp(`^${label}$`) });

/** Waits until the scene is back on the path: no page or panel, markers clickable. */
export async function expectExploring(page: Page) {
  await expect(page.locator('main.page')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.scene')).not.toHaveAttribute('inert');
}

/** The page and panel chunks, by the module name Vite gives each (see `src/pages/registry.ts`, `src/panels/registry.ts`). */
export const PAGE_CHUNKS = [
  'AboutPage',
  'DataVistaPage',
  'NeuroInsightPage',
  'AttritionPage',
  'KanbanLightPage',
  'IngesterPage',
  'ExperiencePage',
  'PublicationsPage',
  'ContactPage',
];
export const PANEL_CHUNKS = ['RolePanel', 'CitationPanel'];

/** A chunk's file, with or without the query a retry adds. */
export const chunkPattern = (name: string) => new RegExp(`/assets/${name}-[\\w-]+\\.js(\\?.*)?$`);

/** Holds back every request for the named chunks until `release`; later requests then go straight through. */
export async function holdChunks(page: Page, names: string[]) {
  const held: Route[] = [];
  let released = false;
  for (const name of names) await page.route(chunkPattern(name), (route) => (released ? route.continue() : void held.push(route)));
  return {
    requested: () => held.length,
    release: async () => {
      released = true;
      await Promise.all(held.splice(0).map((route) => route.continue()));
    },
  };
}

/** The loading screen (see `index.html`). */
export const loadingScreen = (page: Page) => page.locator('#loading-screen');

/** The scene's canvas has loaded and drawn, and the loading screen is gone. */
export async function waitForScene(page: Page) {
  await expect(page.locator('.scene canvas')).toBeAttached({ timeout: 20_000 });
  await expect(loadingScreen(page)).toHaveCount(0, { timeout: 20_000 });
}

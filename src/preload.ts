import { opensPanel, PAGE_IDS, PANEL_ITEMS, type ItemId, type PageId } from './pages/contract';
import { pages } from './pages/registry';
import { panels } from './panels/registry';
import { prefetch, whenIdle } from './ui/chunk';

/** The chunk a marker opens: its panel's for a short item, otherwise its page's. */
const chunkFor = (page: PageId, item: ItemId | null | undefined) => (opensPanel(item) ? panels[item] : pages[page]);

/** Starts fetching what a marker opens: on hover, focus or press, and as its fly-in starts. */
export const prefetchTarget = (page: PageId, item?: ItemId | null) => prefetch(chunkFor(page, item).load);

/** Fetches the chunks one at a time, so the background never crowds out a chunk the visitor is waiting for.
 *  A failure is skipped; that chunk is fetched again when it opens. */
async function loadInTurn(loads: (() => Promise<unknown>)[]) {
  for (const load of loads) await load().catch(() => {});
}

let started = false;

/** Once the browser is idle, fetches every chunk in `loads` in the background. Only the first call does anything. */
function preloadWhenIdle(loads: (() => Promise<unknown>)[]) {
  if (started) return;
  started = true;
  whenIdle(() => void loadInTurn(loads));
}

/** The scene site: every page and every panel, so none of them waits on the network when opened. */
export const preloadAll = () =>
  preloadWhenIdle([...PAGE_IDS.map((id) => pages[id].load), ...[...new Set(PANEL_ITEMS.map((id) => panels[id]))].map((p) => p.load)]);

/** The HTML site has no panels: every page. */
export const preloadPages = () => preloadWhenIdle(PAGE_IDS.map((id) => pages[id].load));

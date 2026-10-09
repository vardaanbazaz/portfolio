import { opensPanel, PAGE_IDS, PANEL_ITEMS, type ItemId, type PageId } from './pages/contract';
import { pages } from './pages/registry';
import { panels } from './panels/registry';
import { prefetch, whenIdle } from './ui/chunk';

/** The chunk a marker opens: its panel's for a short item, otherwise its page's. */
const chunkFor = (page: PageId, item: ItemId | null | undefined) => (opensPanel(item) ? panels[item] : pages[page]);

/** Starts fetching what a marker opens: on hover, focus or press, and as its fly-in starts. */
export const prefetchTarget = (page: PageId, item?: ItemId | null) => prefetch(chunkFor(page, item).load);

/** Fetches the chunks one at a time, so the background never crowds out a chunk the visitor is waiting for.
 *  `onLoaded` runs after each one that arrives. A failure is skipped; that chunk is fetched again when it opens. */
async function loadInTurn(loads: (() => Promise<unknown>)[], onLoaded: () => void = () => {}) {
  for (const load of loads) await load().then(onLoaded, () => {});
}

let started = false;

/** Only the first call to either preload does anything. */
function startOnce(run: () => void) {
  if (started) return;
  started = true;
  run();
}

/** The scene site's chunks: every page and every panel (two items can share a panel's chunk). */
export const SCENE_CHUNK_LOADS = [...PAGE_IDS.map((id) => pages[id].load), ...[...new Set(PANEL_ITEMS.map((id) => panels[id]))].map((p) => p.load)];

/** The scene site: fetches every page and panel at once, so none of them waits on the network when opened. The
 *  loading screen counts each one as it arrives. */
export const preloadAll = (onLoaded: () => void) => startOnce(() => void loadInTurn(SCENE_CHUNK_LOADS, onLoaded));

/** The HTML site has no panels: once the browser is idle, every page. */
export const preloadPages = () => startOnce(() => whenIdle(() => void loadInTurn(PAGE_IDS.map((id) => pages[id].load))));

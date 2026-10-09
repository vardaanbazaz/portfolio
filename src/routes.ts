import { ITEM_PAGE, opensPanel, type ItemId, type PageId, type PanelItemId } from './pages/contract';
import { SECTION_IDS, type SectionId } from './sections/contract';

/** URL path for each page. The one place paths are defined. */
export const PAGE_PATHS: Record<PageId, string> = {
  about: '/about',
  datavista: '/projects/datavista',
  'neuroinsight-ai': '/projects/neuroinsight-ai',
  attrition: '/projects/attrition',
  kanbanlight: '/projects/kanbanlight',
  'unified-api-ingester': '/projects/unified-api-ingester',
  experience: '/experience',
  publications: '/publications',
  contact: '/contact',
};

/** The page a path opens, or null for `/` and unknown paths.
 *  Ignores a trailing slash and letter case, matching React Router's default matching. */
export function pageForPath(pathname: string): PageId | null {
  const path = (pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname).toLowerCase();
  for (const [id, pagePath] of Object.entries(PAGE_PATHS) as [PageId, string][]) {
    if (pagePath === path) return id;
  }
  return null;
}

/** History state a marker with an item opens its page with. The URL stays the page's own path. */
export const itemState = (item: ItemId | undefined) => (item ? { item } : null);

/** The item a history entry's state names for `page`, or null when it names none of that page's items. */
export function itemForState(page: PageId | null, state: unknown): ItemId | null {
  if (!page || typeof state !== 'object' || state === null || !('item' in state)) return null;
  const { item } = state;
  return typeof item === 'string' && Object.hasOwn(ITEM_PAGE, item) && ITEM_PAGE[item as ItemId] === page ? (item as ItemId) : null;
}

/** History state a marker that opens a panel pushes. The URL stays as it is (`/` with the section hash). */
export const panelState = (item: PanelItemId) => ({ panel: item });

/** The panel a history entry's state names, or null when it names none, or when the entry isn't on `/` (a page). */
export function panelForState(page: PageId | null, state: unknown): PanelItemId | null {
  if (page || typeof state !== 'object' || state === null || !('panel' in state)) return null;
  const { panel } = state;
  return typeof panel === 'string' && Object.hasOwn(ITEM_PAGE, panel) && opensPanel(panel as ItemId) ? (panel as PanelItemId) : null;
}

/** Hash that marks a section on `/`, for example `#projects`. */
export const sectionHash = (id: SectionId) => `#${id}`;

/** The section a hash names, or null. */
export function sectionForHash(hash: string): SectionId | null {
  const id = hash.replace(/^#/, '').toLowerCase();
  return SECTION_IDS.find((s) => s === id) ?? null;
}

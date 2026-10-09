import type { PageId } from './pages/contract';
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

/** Hash that marks a section on `/`, for example `#projects`. */
export const sectionHash = (id: SectionId) => `#${id}`;

/** The section a hash names, or null. */
export function sectionForHash(hash: string): SectionId | null {
  const id = hash.replace(/^#/, '').toLowerCase();
  return SECTION_IDS.find((s) => s === id) ?? null;
}

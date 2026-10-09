import type { PageId } from '../pages/contract';
import { SECTION_IDS, type SectionId, type SectionLayout, type SectionMarker } from './contract';
import { layout as about } from './about/layout';
import { layout as projects } from './projects/layout';
import { layout as experience } from './experience/layout';
import { layout as publications } from './publications/layout';
import { layout as contact } from './contact/layout';

/** Each section's layout, without loading the visuals themselves. */
export const sectionLayouts: Record<SectionId, SectionLayout> = { about, projects, experience, publications, contact };

/** The section each page's marker stands in. */
export const PAGE_SECTION = Object.fromEntries(
  SECTION_IDS.flatMap((section) => sectionLayouts[section].markers.map((m) => [m.page, section])),
) as Record<PageId, SectionId>;

/** A page's marker. */
export function markerFor(page: PageId): SectionMarker {
  return sectionLayouts[PAGE_SECTION[page]].markers.find((m) => m.page === page)!;
}

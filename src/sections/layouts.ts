import type { PageId } from '../pages/contract';
import {
  markerKey,
  SECTION_IDS,
  type MarkerKey,
  type MarkerTarget,
  type SectionId,
  type SectionLayout,
  type SectionMarker,
} from './contract';
import { layout as about } from './about/layout';
import { layout as projects } from './projects/layout';
import { layout as experience } from './experience/layout';
import { layout as publications } from './publications/layout';
import { layout as contact } from './contact/layout';

/** Each section's layout, without loading the visuals themselves. */
export const sectionLayouts: Record<SectionId, SectionLayout> = { about, projects, experience, publications, contact };

export interface PlacedMarker {
  key: MarkerKey;
  section: SectionId;
  marker: SectionMarker;
}

/** Every marker in the scene, in path order. */
export const MARKERS: readonly PlacedMarker[] = SECTION_IDS.flatMap((section) =>
  sectionLayouts[section].markers.map((marker) => ({ key: markerKey(marker), section, marker })),
);

const byKey = new Map(MARKERS.map((m) => [m.key, m]));

/** The section each page's markers stand in. */
export const PAGE_SECTION = Object.fromEntries(MARKERS.map((m) => [m.marker.page, m.section])) as Record<PageId, SectionId>;

/** The marker a target names, or undefined when there is none (a page with items, opened without one). */
export const markerAt = (target: MarkerTarget): PlacedMarker | undefined => byKey.get(markerKey(target));

/** The marker that gets focus back after a target's page closes: its own marker, else the page's first. */
export function returnMarker(target: MarkerTarget): MarkerKey {
  return (markerAt(target) ?? MARKERS.find((m) => m.marker.page === target.page)!).key;
}

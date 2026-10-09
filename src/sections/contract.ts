import type { ComponentType } from 'react';
import type { ItemId, PageId } from '../pages/contract';
import type { FrameValue, Quality } from '../visuals/shared';

/** Sections along the path, in path order. */
export type SectionId = 'about' | 'projects' | 'experience' | 'publications' | 'contact';

export const SECTION_IDS: readonly SectionId[] = ['about', 'projects', 'experience', 'publications', 'contact'];

export type Vec3 = [x: number, y: number, z: number];

/** A box in a section's local space. */
export interface LocalBox {
  centre: Vec3;
  /** Half-extents. */
  half: Vec3;
}

/** What a marker opens: a page, or one item within a page (the page opens scrolled to that item). */
export interface MarkerTarget {
  page: PageId;
  /** An item of `page` (see `PAGE_ITEMS`). Absent: the marker opens the whole page. */
  item?: ItemId;
}

/** Identifies a marker: its item, or its page when it has no item. */
export type MarkerKey = PageId | ItemId;

export const markerKey = ({ page, item }: MarkerTarget): MarkerKey => item ?? page;

/** One clickable object in a section. A page without items has one marker; a page with items has one per item. */
export interface SectionMarker extends MarkerTarget {
  /** The part of the visual this marker belongs to. Its marker button is pinned above it,
   *  the inspect pose frames it, and a click on the visual nearest to it opens its target. */
  box: LocalBox;
}

/** A section's geometry as plain data, so the scene and tests can read it without loading the visual. */
export interface SectionLayout {
  /** Half-extents of the whole visual's local bounding box, centred on the origin. */
  bounds: Vec3;
  /** At least one. Each box lies inside `bounds`. */
  markers: readonly SectionMarker[];
}

export interface SectionVisualProps {
  /** 0 when the camera is far from this section, 1 at the section's path point.
   *  Updated every frame; read `.current` inside useFrame. */
  proximity: FrameValue<number>;
  /** The marker of this section whose page is opening, open or closing; null otherwise
   *  (also null when the page was opened without an item, by its URL, and has several markers). */
  active: MarkerKey | null;
  /** The marker whose button or part of the visual is hovered or keyboard-focused; null otherwise. */
  hovered: MarkerKey | null;
  quality: Quality;
}

/** A section visual. The scene owns world placement; the visual owns local space. */
export interface SectionVisualModule {
  id: SectionId;
  /** Renders in local space, centred on the origin, inside `layout.bounds`. */
  Visual: ComponentType<SectionVisualProps>;
  layout: SectionLayout;
  /** Optional: preload anything local (bundled) before first render. */
  preload?: () => Promise<void>;
}

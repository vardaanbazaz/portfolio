import type { ComponentType } from 'react';
import type { PageId } from '../pages/contract';
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

/** One clickable object in a section. Each marker opens its own page. */
export interface SectionMarker {
  page: PageId;
  /** The part of the visual this marker belongs to. Its marker button is pinned above it,
   *  the inspect pose frames it, and a click on the visual nearest to it opens `page`. */
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
  /** The page of this section that is opening, open or closing; null otherwise. */
  active: PageId | null;
  /** The page whose marker or part of the visual is hovered or keyboard-focused; null otherwise. */
  hovered: PageId | null;
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

import type { ComponentType } from 'react';
import type { FrameValue, Quality } from '../visuals/shared';

export type StopId = 'datavista' | 'publications' | 'experience';

export const STOP_IDS: readonly StopId[] = ['datavista', 'publications', 'experience'];

export interface StopVisualProps {
  /** 0 when the camera is far from this stop, 1 at the stop's path point.
   *  Updated every frame; read `.current` inside useFrame. */
  proximity: FrameValue<number>;
  /** True while this stop's page is opening, open, or closing. */
  active: boolean;
  /** True while the marker or the box is hovered or keyboard-focused. */
  hovered: boolean;
  quality: Quality;
}

/** Static description of a stop visual. The scene owns world placement; the visual owns local space. */
export interface StopVisualModule {
  id: StopId;
  /** Renders in local space, centred on the origin, inside `bounds`. */
  Visual: ComponentType<StopVisualProps>;
  /** Half-extents of the local bounding box, used to frame the inspect pose. */
  bounds: [x: number, y: number, z: number];
  /** Local-space point where the marker button is pinned. */
  markerAnchor: [x: number, y: number, z: number];
  /** Optional: preload anything local (bundled) before first render. */
  preload?: () => Promise<void>;
}

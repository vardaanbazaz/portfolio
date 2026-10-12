import type { Mesh } from 'three';
import type { FrameValue, Quality } from '../visuals/shared';

/**
 * What the dev readout (?fps) reads about the scene, every animation frame. The scene writes these references once
 * as they change; the readout reads through them, so it keeps reporting while the canvas draws on demand.
 */
export const sceneProbe: {
  pathT: FrameValue<number> | null;
  quality: Quality | null;
  frameloop: 'always' | 'demand' | null;
  /** The environment's sky dome, if it has one. Its material carries an `opacity` uniform. */
  dome: Mesh | null;
} = { pathT: null, quality: null, frameloop: null, dome: null };

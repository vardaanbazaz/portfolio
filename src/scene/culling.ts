import type { Quality } from '../visuals/shared';
import { CULL_DISTANCE } from './tuning';

/** Whether a section should be drawn, given the camera's distance to its centre and its bounding radius. */
export function sectionInRange(distance: number, boundsRadius: number, quality: Quality): boolean {
  return distance - boundsRadius <= CULL_DISTANCE[quality];
}

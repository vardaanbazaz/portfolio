import type { StopVisualModule } from '../contract';

/** Half-extents of this stop's visual. Plain data so scene geometry and tests can read it without loading the visual. */
export const bounds: StopVisualModule['bounds'] = [1.1, 1.1, 1.1];

import type { PageId } from '../../pages/contract';
import type { SectionLayout, SectionMarker, Vec3 } from '../contract';

/** Projects in marker order along the row, left to right as seen from the path. */
const PROJECTS: readonly PageId[] = ['datavista', 'neuroinsight-ai', 'attrition', 'kanbanlight', 'unified-api-ingester'];

const SPACING = 0.9;
const HALF_WIDTH = 0.35;
/** Alternating heights, so neighbouring marker buttons sit at different heights. */
const HALF_HEIGHTS = [0.45, 1.05] as const;
const TALLEST = Math.max(...HALF_HEIGHTS);
/** How far the row curves toward the path at its ends. */
const CURVE = 0.1;

const markers: SectionMarker[] = PROJECTS.map((page, i) => {
  const x = (i - (PROJECTS.length - 1) / 2) * SPACING;
  const halfY = HALF_HEIGHTS[i % 2];
  // Each box stands on the floor (local y = -TALLEST); the row wraps slightly around the viewer.
  const centre: Vec3 = [x, halfY - TALLEST, CURVE * x * x - 0.2];
  return { page, box: { centre, half: [HALF_WIDTH, halfY, HALF_WIDTH] } };
});

/** Plain data so scene geometry and tests can read it without loading the visual. */
export const layout: SectionLayout = {
  bounds: [2 * SPACING + HALF_WIDTH, TALLEST, 0.2 + HALF_WIDTH],
  markers,
};

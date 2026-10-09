import type { SectionLayout } from '../contract';
import { rowLayout } from '../row';

/** One box per role, most recent first (left as seen from the path). Different heights, so the two
 *  marker buttons sit at different heights. Plain data so scene geometry and tests can read it without loading the visual. */
export const layout: SectionLayout = rowLayout(
  [
    { page: 'experience', item: 'drdo', half: [0.45, 1.05, 0.45] },
    { page: 'experience', item: 'agrybin', half: [0.45, 0.6, 0.45] },
  ],
  0.3,
);

import type { SectionLayout } from '../contract';
import { rowLayout } from '../row';

/** One box per paper. Web Page Linker is a citation, not a write-up, so its box is clearly smaller.
 *  Plain data so scene geometry and tests can read it without loading the visual. */
export const layout: SectionLayout = rowLayout(
  [
    { page: 'publications', item: 'v-surveillance', half: [0.45, 1.4, 0.45] },
    { page: 'publications', item: 'web-page-linker', half: [0.25, 0.5, 0.25] },
  ],
  0.3,
);

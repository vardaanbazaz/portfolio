import type { SectionLayout } from '../contract';
import { singleBoxLayout } from '../single';

/** Plain data so scene geometry and tests can read it without loading the visual. */
export const layout: SectionLayout = singleBoxLayout('experience', [1.1, 1.1, 1.1]);

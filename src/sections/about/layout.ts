import type { SectionLayout } from '../contract';
import { singleBoxLayout } from '../single';

/** Plain data so scene geometry and tests can read it without loading the visual. */
export const layout: SectionLayout = singleBoxLayout('about', [0.8, 1.2, 0.8]);

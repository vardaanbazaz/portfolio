import type { SectionLayout } from '../contract';
import { singleBoxLayout } from '../single';

/** Plain data so scene geometry and tests can read it without loading the visual. */
export const layout: SectionLayout = singleBoxLayout('contact', [0.9, 0.7, 0.9]);

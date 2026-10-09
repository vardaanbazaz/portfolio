import type { PageId } from '../pages/contract';
import type { SectionLayout, Vec3 } from './contract';

/** Layout of a section that is one box with one marker. */
export function singleBoxLayout(page: PageId, bounds: Vec3): SectionLayout {
  return { bounds, markers: [{ page, box: { centre: [0, 0, 0], half: bounds } }] };
}

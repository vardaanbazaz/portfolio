import { Euler, MathUtils, Vector3 } from 'three';
import type { PageId } from '../pages/contract';
import { SECTION_IDS, type LocalBox, type SectionId } from '../sections/contract';
import { markerFor, PAGE_SECTION, sectionLayouts } from '../sections/layouts';
import { fovForAspect, pathPos, SECTION_T, sectionGroundPoint } from './cameraPath';
import { INSPECT_ELEVATION, INSPECT_MARGIN, MARKER_LIFT } from './tuning';

export interface SectionPlacement {
  /** World ground point under the section's local origin. */
  ground: [x: number, y: number, z: number];
  /** Rotation about Y so the section faces its path point. */
  rotationY: number;
}

function place(id: SectionId): SectionPlacement {
  const ground = sectionGroundPoint(id);
  const facing = pathPos(SECTION_T[id]).sub(ground);
  return {
    ground: ground.toArray() as SectionPlacement['ground'],
    rotationY: Math.atan2(facing.x, facing.z),
  };
}

export const sectionLayout = Object.fromEntries(SECTION_IDS.map((id) => [id, place(id)])) as Record<
  SectionId,
  SectionPlacement
>;

/** Height of each section's centre above the floor (visuals are lifted by their half-height). */
export const sectionCentreHeights = Object.fromEntries(
  SECTION_IDS.map((id) => [id, sectionLayouts[id].bounds[1]]),
) as Record<SectionId, number>;

/** A point in a section's local (visual) space, in world space. */
export function sectionToWorld(id: SectionId, local: [number, number, number], target = new Vector3()): Vector3 {
  const { ground, rotationY } = sectionLayout[id];
  return target
    .set(local[0], local[1] + sectionLayouts[id].bounds[1], local[2])
    .applyEuler(new Euler(0, rotationY, 0))
    .add(new Vector3(...ground));
}

/** World point a page's marker button is pinned to: just above the top of its box. */
export function markerWorldAnchor(page: PageId, target = new Vector3()): Vector3 {
  const { centre, half } = markerFor(page).box;
  return sectionToWorld(PAGE_SECTION[page], [centre[0], centre[1] + half[1] + MARKER_LIFT, centre[2]], target);
}

/** Index of the marker whose box centre is nearest to a point in the section's local space (x and z only). */
export function nearestMarkerIndex(boxes: readonly LocalBox[], x: number, z: number): number {
  let best = 0;
  let bestDistance = Infinity;
  boxes.forEach(({ centre }, i) => {
    const d = Math.hypot(centre[0] - x, centre[2] - z);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return best;
}

const scratchDir = new Vector3();

/** Camera pose while a page is open: in front of its marker's box, a little above it, framing the whole box.
 *  Writes position and look-at target. */
export function inspectPose(page: PageId, aspect: number, position: Vector3, look: Vector3): void {
  const section = PAGE_SECTION[page];
  const { centre, half } = markerFor(page).box;
  sectionToWorld(section, centre, look);

  const radius = Math.hypot(...half);
  const halfV = MathUtils.degToRad(fovForAspect(aspect) / 2);
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  const distance = (radius / Math.sin(Math.min(halfV, halfH))) * INSPECT_MARGIN;

  // From the box toward the section's path point, so the camera stays on the side it arrived from.
  pathPos(SECTION_T[section], scratchDir).sub(look).setY(0).normalize();
  scratchDir.y = INSPECT_ELEVATION;
  position.copy(look).addScaledVector(scratchDir.normalize(), distance);
}

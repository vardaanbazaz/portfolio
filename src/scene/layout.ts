import { Euler, MathUtils, Vector3 } from 'three';
import { SECTION_IDS, type LocalBox, type MarkerTarget, type SectionId } from '../sections/contract';
import { markerAt, PAGE_SECTION, sectionLayouts, type PlacedMarker } from '../sections/layouts';
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

/** World point a marker's button is pinned to: just above the top of its box. */
export function markerWorldAnchor({ section, marker }: PlacedMarker, target = new Vector3()): Vector3 {
  const { centre, half } = marker.box;
  return sectionToWorld(section, [centre[0], centre[1] + half[1] + MARKER_LIFT, centre[2]], target);
}

/** What the inspect pose frames for a target: its marker's box, or the whole section when the target names
 *  no marker (a page with items, opened by its URL). */
export function inspectBox(target: MarkerTarget): { section: SectionId; box: LocalBox } {
  const placed = markerAt(target);
  if (placed) return { section: placed.section, box: placed.marker.box };
  const section = PAGE_SECTION[target.page];
  return { section, box: { centre: [0, 0, 0], half: sectionLayouts[section].bounds } };
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
const scratchForward = new Vector3();
const scratchRight = new Vector3();
const scratchUp = new Vector3();
const WORLD_UP = new Vector3(0, 1, 0);

/** Where the inspect pose puts the target's box on screen: centred in the whole frame (a page), or centred in one
 *  half beside a panel: the left half with the panel on the right (`side`), or the top half with the panel below
 *  (`stacked`, on narrow screens). */
export type Framing = 'whole' | 'side' | 'stacked';

/** Angle from the view axis within which the box must fit along one screen axis, given the tangent of that axis's
 *  half field of view. In a half frame the box sits off-axis, so its room is the smaller, outer part of that half. */
const fitAngle = (halfTan: number, half: boolean) => (half ? Math.atan(halfTan) - Math.atan(halfTan / 2) : Math.atan(halfTan));

/** Camera pose while a page or panel is open: in front of the target's box (see `inspectBox`), a little above it,
 *  framing the whole box where `framing` says. Writes position and look-at target. */
export function inspectPose(
  target: MarkerTarget,
  aspect: number,
  position: Vector3,
  look: Vector3,
  framing: Framing = 'whole',
): void {
  const { section, box } = inspectBox(target);
  const { centre, half } = box;
  sectionToWorld(section, centre, look);

  const radius = Math.hypot(...half);
  const tanV = Math.tan(MathUtils.degToRad(fovForAspect(aspect) / 2));
  const tanH = tanV * aspect;
  const fit = Math.min(fitAngle(tanV, framing === 'stacked'), fitAngle(tanH, framing === 'side'));
  const distance = (radius / Math.sin(fit)) * INSPECT_MARGIN;

  // From the box toward the section's path point, so the camera stays on the side it arrived from.
  pathPos(SECTION_T[section], scratchDir).sub(look).setY(0).normalize();
  scratchDir.y = INSPECT_ELEVATION;
  position.copy(look).addScaledVector(scratchDir.normalize(), distance);
  if (framing === 'whole') return;

  // Aim past the box, so it sits at the centre of its half: half the frame's half-width to its right (`side`),
  // or half its half-height below it (`stacked`).
  scratchForward.subVectors(look, position).normalize();
  scratchRight.crossVectors(scratchForward, WORLD_UP).normalize();
  if (framing === 'side') {
    look.addScaledVector(scratchRight, (distance * tanH) / 2);
  } else {
    scratchUp.crossVectors(scratchRight, scratchForward);
    look.addScaledVector(scratchUp, (-distance * tanV) / 2);
  }
}

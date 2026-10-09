import { CatmullRomCurve3, MathUtils, Vector3 } from 'three';
import type { SectionId } from '../sections/contract';
import {
  BASE_FOV,
  LOOK_AHEAD,
  MAX_FOV,
  PORTRAIT_PULLBACK,
  PORTRAIT_PULLBACK_MAX,
  LANDING_FADE_T,
  LANDING_STRETCH_T,
  MENU_TRAVEL_MAX_SECONDS,
  MENU_TRAVEL_MIN_SECONDS,
  MENU_TRAVEL_SECONDS_PER_GAP,
  SECTION_LOOK_WEIGHT,
  SECTION_PROXIMITY_RADIUS,
} from './tuning';

/** Where on the path (0..1) each section sits. 0 to LANDING_STRETCH_T is the landing stretch. */
export const SECTION_T: Record<SectionId, number> = {
  about: 0.2,
  projects: 0.39,
  experience: 0.58,
  publications: 0.77,
  contact: 0.96,
};

/** Which side of the path each section stands on (-1 left, 1 right), and how far out to the side. */
const SECTION_PLACEMENT: Record<SectionId, { side: -1 | 1; lateral: number }> = {
  about: { side: -1, lateral: 3.5 },
  // Wider than the others (one box per project), so it stands further out to fit in frame.
  projects: { side: 1, lateral: 5.5 },
  experience: { side: -1, lateral: 3.5 },
  publications: { side: 1, lateral: 3.5 },
  contact: { side: -1, lateral: 3.5 },
};

/** How far ahead of the camera's path point at the section's t each section stands. */
const SECTION_FORWARD = 4;

/** Height the camera looks at between sections. */
const LOOK_HEIGHT_AHEAD = 1.2;

export const cameraCurve = new CatmullRomCurve3(
  [
    new Vector3(0, 2.4, 14),
    new Vector3(0.8, 2.0, 4),
    new Vector3(-0.8, 1.8, -8),
    new Vector3(0.8, 2.0, -20),
    new Vector3(0, 2.2, -32),
  ],
  false,
  'centripetal',
);

const UP = new Vector3(0, 1, 0);
const scratchTangent = new Vector3();
const scratchSide = new Vector3();
const scratchSection = new Vector3();
const scratchDir = new Vector3();

export const clamp01 = (x: number) => MathUtils.clamp(x, 0, 1);

/** Camera position at path position t. */
export function pathPos(t: number, target = new Vector3()): Vector3 {
  return cameraCurve.getPointAt(clamp01(t), target);
}

/** Scroll progress 0..1 from the window's scroll offset and its maximum. */
export function scrollProgress(scrollY: number, maxScroll: number): number {
  return maxScroll > 0 ? clamp01(scrollY / maxScroll) : 0;
}

/** Frame-rate independent exponential ease of `current` toward `target`. */
export function dampTowards(current: number, target: number, lambda: number, delta: number): number {
  if (!Number.isFinite(lambda)) return target;
  return current + (target - current) * (1 - Math.exp(-lambda * delta));
}

const smoothstep = (x: number) => x * x * (3 - 2 * x);

/** 1 at the section's t, easing to 0 at `radius` away (smoothstep). */
export function sectionProximity(t: number, sectionT: number, radius = SECTION_PROXIMITY_RADIUS): number {
  const d = Math.abs(t - sectionT);
  if (d >= radius) return 0;
  return smoothstep(1 - d / radius);
}

/** The section nearest to path position `t`, or null on the landing stretch. */
export function nearestSection(t: number, landingEndT = LANDING_STRETCH_T): SectionId | null {
  if (t < landingEndT) return null;
  let nearest: SectionId | null = null;
  let best = Infinity;
  for (const id of Object.keys(SECTION_T) as SectionId[]) {
    const d = Math.abs(t - SECTION_T[id]);
    if (d < best) {
      best = d;
      nearest = id;
    }
  }
  return nearest;
}

/** Path distance (t) between neighbouring sections. */
export const SECTION_GAP_T = SECTION_T.projects - SECTION_T.about;

/** Seconds a menu travel takes between two path positions: scaled by section gaps, clamped; 0 when already there. */
export function travelSeconds(fromT: number, toT: number): number {
  const gaps = Math.abs(toT - fromT) / SECTION_GAP_T;
  if (gaps === 0) return 0;
  return MathUtils.clamp(gaps * MENU_TRAVEL_SECONDS_PER_GAP, MENU_TRAVEL_MIN_SECONDS, MENU_TRAVEL_MAX_SECONDS);
}

/** Opacity of the landing text: 1 at the start of the path, 0 from `fadeT` on. */
export function landingOpacity(t: number, fadeT = LANDING_FADE_T): number {
  return 1 - smoothstep(clamp01(t / fadeT));
}

/** Ground point (y = 0) a section stands on, beside the path. */
export function sectionGroundPoint(id: SectionId, target = new Vector3()): Vector3 {
  const t = SECTION_T[id];
  const { side, lateral } = SECTION_PLACEMENT[id];
  cameraCurve.getTangentAt(t, scratchTangent).setY(0).normalize();
  scratchSide.crossVectors(scratchTangent, UP).normalize().multiplyScalar(side * lateral);
  pathPos(t, target).addScaledVector(scratchTangent, SECTION_FORWARD).add(scratchSide);
  return target.setY(0);
}

/** Look-at point at path position t: ahead on the path, turned toward any nearby section's centre.
 *  `sectionHeights` is each section's centre height above the floor. */
export function lookPos(t: number, sectionHeights: Record<SectionId, number>, target = new Vector3()): Vector3 {
  const ahead = t + LOOK_AHEAD;
  if (ahead <= 1) {
    pathPos(ahead, target);
  } else {
    // Past the end of the path, keep looking along the final direction.
    pathPos(1, target);
    cameraCurve.getTangentAt(1, scratchTangent);
    target.addScaledVector(scratchTangent, (ahead - 1) * cameraCurve.getLength());
  }
  target.setY(LOOK_HEIGHT_AHEAD);

  let nearest: SectionId | null = null;
  let weight = 0;
  for (const id of Object.keys(SECTION_T) as SectionId[]) {
    const w = sectionProximity(t, SECTION_T[id]);
    if (w > weight) {
      weight = w;
      nearest = id;
    }
  }
  if (nearest) {
    sectionGroundPoint(nearest, scratchSection).setY(sectionHeights[nearest]);
    target.lerp(scratchSection, weight * SECTION_LOOK_WEIGHT);
  }
  return target;
}

/** Vertical FOV that keeps roughly the landscape framing on portrait screens. */
export function fovForAspect(aspect: number, baseFov = BASE_FOV, maxFov = MAX_FOV): number {
  if (aspect >= 1) return baseFov;
  const halfTan = Math.tan(MathUtils.degToRad(baseFov / 2));
  const fov = MathUtils.radToDeg(2 * Math.atan(halfTan / aspect));
  return Math.min(fov, maxFov);
}

/** How far the camera steps back along its view on portrait screens. 0 on landscape. */
export function portraitPullback(aspect: number): number {
  if (aspect >= 1) return 0;
  return Math.min(PORTRAIT_PULLBACK_MAX, PORTRAIT_PULLBACK * (1 / aspect - 1));
}

/** Full camera pose at path position t for a given screen aspect: writes position and look-at target. */
export function cameraPose(
  t: number,
  aspect: number,
  sectionHeights: Record<SectionId, number>,
  position: Vector3,
  look: Vector3,
): void {
  pathPos(t, position);
  lookPos(t, sectionHeights, look);
  const back = portraitPullback(aspect);
  if (back > 0) {
    scratchDir.subVectors(look, position).normalize();
    position.addScaledVector(scratchDir, -back);
  }
}

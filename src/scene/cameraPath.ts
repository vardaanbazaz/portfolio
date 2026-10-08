import { CatmullRomCurve3, MathUtils, Vector3 } from 'three';
import type { StopId } from '../stops/contract';
import {
  BASE_FOV,
  LOOK_AHEAD,
  MAX_FOV,
  PORTRAIT_PULLBACK,
  PORTRAIT_PULLBACK_MAX,
  STOP_LOOK_WEIGHT,
  STOP_PROXIMITY_RADIUS,
} from './tuning';

/** Where on the path (0..1) each stop sits. 0 to 0.1 is the intro stretch. */
export const STOP_T: Record<StopId, number> = {
  datavista: 0.25,
  publications: 0.55,
  experience: 0.85,
};

/** Which side of the path each stop stands on: -1 left, 1 right. */
const STOP_SIDE: Record<StopId, -1 | 1> = {
  datavista: -1,
  publications: 1,
  experience: -1,
};

/** Stop placement relative to the camera's path point at the stop's t. */
const STOP_FORWARD = 4;
const STOP_LATERAL = 3.5;

/** Height the camera looks at between stops. */
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
const scratchStop = new Vector3();
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

/** 1 at the stop's t, easing to 0 at `radius` away (smoothstep). */
export function stopProximity(t: number, stopT: number, radius = STOP_PROXIMITY_RADIUS): number {
  const d = Math.abs(t - stopT);
  if (d >= radius) return 0;
  const x = 1 - d / radius;
  return x * x * (3 - 2 * x);
}

/** Ground point (y = 0) a stop stands on, beside the path. */
export function stopGroundPoint(id: StopId, target = new Vector3()): Vector3 {
  const t = STOP_T[id];
  cameraCurve.getTangentAt(t, scratchTangent).setY(0).normalize();
  scratchSide.crossVectors(scratchTangent, UP).normalize().multiplyScalar(STOP_SIDE[id] * STOP_LATERAL);
  pathPos(t, target).addScaledVector(scratchTangent, STOP_FORWARD).add(scratchSide);
  return target.setY(0);
}

/** Look-at point at path position t: ahead on the path, turned toward any nearby stop's centre.
 *  `stopHeights` is each stop's centre height above the floor. */
export function lookPos(t: number, stopHeights: Record<StopId, number>, target = new Vector3()): Vector3 {
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

  let nearest: StopId | null = null;
  let weight = 0;
  for (const id of Object.keys(STOP_T) as StopId[]) {
    const w = stopProximity(t, STOP_T[id]);
    if (w > weight) {
      weight = w;
      nearest = id;
    }
  }
  if (nearest) {
    stopGroundPoint(nearest, scratchStop).setY(stopHeights[nearest]);
    target.lerp(scratchStop, weight * STOP_LOOK_WEIGHT);
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
  stopHeights: Record<StopId, number>,
  position: Vector3,
  look: Vector3,
): void {
  pathPos(t, position);
  lookPos(t, stopHeights, look);
  const back = portraitPullback(aspect);
  if (back > 0) {
    scratchDir.subVectors(look, position).normalize();
    position.addScaledVector(scratchDir, -back);
  }
}

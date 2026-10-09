import { MathUtils, Vector3 } from 'three';
import { stopBounds } from '../stops/bounds';
import { STOP_IDS, type StopId } from '../stops/contract';
import { fovForAspect, pathPos, STOP_T, stopGroundPoint } from './cameraPath';
import { INSPECT_ELEVATION, INSPECT_MARGIN } from './tuning';

export interface StopPlacement {
  /** World ground point under the stop's local origin. */
  ground: [x: number, y: number, z: number];
  /** Rotation about Y so the stop faces its path point. */
  rotationY: number;
}

function place(id: StopId): StopPlacement {
  const ground = stopGroundPoint(id);
  const facing = pathPos(STOP_T[id]).sub(ground);
  return {
    ground: ground.toArray() as StopPlacement['ground'],
    rotationY: Math.atan2(facing.x, facing.z),
  };
}

export const stopLayout = Object.fromEntries(STOP_IDS.map((id) => [id, place(id)])) as Record<
  StopId,
  StopPlacement
>;

/** Height of each stop's centre above the floor (visuals are lifted by their half-height). */
export const stopCentreHeights = Object.fromEntries(STOP_IDS.map((id) => [id, stopBounds[id][1]])) as Record<
  StopId,
  number
>;

const scratchDir = new Vector3();

/** Camera pose while a stop's page is open: in front of the stop, a little above it, framing its whole
 *  bounding box. Writes position and look-at target. */
export function inspectPose(id: StopId, aspect: number, position: Vector3, look: Vector3): void {
  const { ground } = stopLayout[id];
  look.set(ground[0], stopCentreHeights[id], ground[2]);

  const radius = Math.hypot(...stopBounds[id]);
  const halfV = MathUtils.degToRad(fovForAspect(aspect) / 2);
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  const distance = (radius / Math.sin(Math.min(halfV, halfH))) * INSPECT_MARGIN;

  // From the stop toward its path point, so the camera stays on the side it arrived from.
  pathPos(STOP_T[id], scratchDir).sub(look).setY(0).normalize();
  scratchDir.y = INSPECT_ELEVATION;
  position.copy(look).addScaledVector(scratchDir.normalize(), distance);
}

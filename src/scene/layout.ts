import { stopBounds } from '../stops/bounds';
import { STOP_IDS, type StopId } from '../stops/contract';
import { pathPos, STOP_T, stopGroundPoint } from './cameraPath';

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

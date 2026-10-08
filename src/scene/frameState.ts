import { STOP_IDS, type StopId } from '../stops/contract';

/** Per-frame values the camera rig writes and visuals read (as FrameValue). */
export interface FrameState {
  pathT: { current: number };
  proximity: Record<StopId, { current: number }>;
}

export function createFrameState(): FrameState {
  return {
    pathT: { current: 0 },
    proximity: Object.fromEntries(STOP_IDS.map((id) => [id, { current: 0 }])) as FrameState['proximity'],
  };
}

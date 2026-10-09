import { SECTION_IDS, type SectionId } from '../sections/contract';

/** Per-frame values the camera rig writes and visuals read (as FrameValue). */
export interface FrameState {
  pathT: { current: number };
  proximity: Record<SectionId, { current: number }>;
}

export function createFrameState(): FrameState {
  return {
    pathT: { current: 0 },
    proximity: Object.fromEntries(SECTION_IDS.map((id) => [id, { current: 0 }])) as FrameState['proximity'],
  };
}

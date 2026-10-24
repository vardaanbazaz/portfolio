import type { Quality } from '../visuals/shared';
import { PERF_DECLINE_BELOW_FPS, PERF_MAX_DROPS, PERF_RECOVER_FPS } from './tuning';

/** The frame rates below which quality drops and at or above which it comes back, for a screen's refresh rate. */
export const perfBounds = (refreshRate: number): [lower: number, upper: number] => [
  PERF_DECLINE_BELOW_FPS,
  Math.max(PERF_DECLINE_BELOW_FPS + 1, Math.min(PERF_RECOVER_FPS, refreshRate - 5)),
];

/** The scene's quality, whether a frame-rate decline is holding it down (which also caps the pixel ratio), and how
 *  many times one has. */
export interface PerfState {
  quality: Quality;
  slowed: boolean;
  drops: number;
}

export const startPerf = (quality: Quality): PerfState => ({ quality, slowed: false, drops: 0 });

/** The state after the frame rate declines or recovers. A decline drops quality to 'low'. Once the frame rate
 *  recovers, quality comes back to what the visit started at (never above it: a narrow screen starts low and stays
 *  low), unless it has already dropped `PERF_MAX_DROPS` times. Unchanged states are returned as they are. */
export function nextPerf(state: PerfState, change: 'decline' | 'incline', start: Quality): PerfState {
  if (change === 'decline') return state.slowed ? state : { quality: 'low', slowed: true, drops: state.drops + 1 };
  if (!state.slowed || state.drops >= PERF_MAX_DROPS) return state;
  return { quality: start, slowed: false, drops: state.drops };
}

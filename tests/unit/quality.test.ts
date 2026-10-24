import { describe, expect, it } from 'vitest';
import { nextPerf, perfBounds, startPerf } from '../../src/scene/quality';
import { PERF_DECLINE_BELOW_FPS, PERF_MAX_DROPS, PERF_RECOVER_FPS } from '../../src/scene/tuning';

describe('the frame-rate bounds', () => {
  it('drop quality below PERF_DECLINE_BELOW_FPS and bring it back from PERF_RECOVER_FPS on a 60 Hz screen', () => {
    expect(perfBounds(60)).toEqual([PERF_DECLINE_BELOW_FPS, PERF_RECOVER_FPS]);
  });

  it('can always be reached: never above the refresh rate less 5, and never Infinity', () => {
    for (const rate of [30, 48, 60, 75, 120, 144]) {
      const [lower, upper] = perfBounds(rate);
      expect(Number.isFinite(upper)).toBe(true);
      expect(upper).toBeGreaterThan(lower);
      if (rate - 5 > lower) expect(upper).toBeLessThanOrEqual(rate - 5);
    }
  });
});

describe('the quality after the frame rate declines or recovers', () => {
  it('drops to low and lowers the pixel ratio on a decline', () => {
    expect(nextPerf(startPerf('high'), 'decline', 'high')).toEqual({ quality: 'low', slowed: true, drops: 1 });
  });

  it('comes back to high once the frame rate recovers, as after a crossing', () => {
    const slowed = nextPerf(startPerf('high'), 'decline', 'high');
    expect(nextPerf(slowed, 'incline', 'high')).toEqual({ quality: 'high', slowed: false, drops: 1 });
  });

  it('never climbs above the quality the visit started at', () => {
    const narrow = nextPerf(startPerf('low'), 'decline', 'low');
    expect(nextPerf(narrow, 'incline', 'low')).toEqual({ quality: 'low', slowed: false, drops: 1 });
  });

  it('leaves a steady state as it is, so a recovered frame rate changes nothing', () => {
    const state = startPerf('high');
    expect(nextPerf(state, 'incline', 'high')).toBe(state);
    const slowed = nextPerf(state, 'decline', 'high');
    expect(nextPerf(slowed, 'decline', 'high')).toBe(slowed);
  });

  it(`stays low for the rest of the visit after ${PERF_MAX_DROPS} drops`, () => {
    let state = startPerf('high');
    for (let i = 0; i < PERF_MAX_DROPS; i++) {
      state = nextPerf(state, 'decline', 'high');
      if (i < PERF_MAX_DROPS - 1) {
        state = nextPerf(state, 'incline', 'high');
        expect(state.quality).toBe('high');
      }
    }
    expect(nextPerf(state, 'incline', 'high').quality).toBe('low');
  });
});

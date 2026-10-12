import { describe, expect, it } from 'vitest';
import { GATE_GESTURE_GAP_SECONDS } from '../../src/scene/tuning';
import { scrollGestures } from '../../src/ui/loadingScreen';

const GAP_MS = GATE_GESTURE_GAP_SECONDS * 1000;

/** How many gestures start among events at these times (ms), each continuing or not. */
function starts(events: [time: number, continuing: boolean][]) {
  const startsGesture = scrollGestures(GATE_GESTURE_GAP_SECONDS);
  return events.filter(([time, continuing]) => startsGesture(time, continuing)).length;
}

const fresh = (times: number[]) => times.map((time): [number, boolean] => [time, false]);

describe('scrollGestures', () => {
  it('starts one gesture per event when the events are 0.5 s apart', () => {
    expect(starts(fresh([1000, 1500, 2000, 2500, 3000]))).toBe(5);
  });

  it('starts one gesture for 40 events 16 ms apart', () => {
    expect(starts(fresh(Array.from({ length: 40 }, (_, i) => 1000 + i * 16)))).toBe(1);
  });

  it('starts a new gesture only after a full quiet gap', () => {
    expect(starts(fresh([1000, 1000 + GAP_MS - 1]))).toBe(1);
    expect(starts(fresh([1000, 1000 + GAP_MS]))).toBe(2);
  });

  it('keeps a gap measured from the last event, not the first', () => {
    // Each event comes just inside the gap after the one before, for far longer than the gap in all.
    expect(starts(fresh(Array.from({ length: 20 }, (_, i) => 1000 + i * (GAP_MS - 10))))).toBe(1);
  });

  it('starts one gesture for a held key, whose repeats come after a delay longer than the gap', () => {
    const repeats = Array.from({ length: 40 }, (_, i): [number, boolean] => [1500 + i * 33, true]);
    expect(starts([[1000, false], ...repeats])).toBe(1);
  });

  it('never starts a gesture on an event that only continues one', () => {
    expect(starts([[1000, true]])).toBe(0);
  });

  it('lets a continuing event extend the gap, so a fresh event right after it starts nothing', () => {
    expect(starts([[1000, false], [1400, true], [1500, false]])).toBe(1);
  });
});

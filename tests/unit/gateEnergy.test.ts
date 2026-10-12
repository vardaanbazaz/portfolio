import { describe, expect, it } from 'vitest';
import {
  GATE_ENERGY_MAX_SCALE,
  GATE_ENERGY_PER_KEY,
  GATE_ENERGY_PER_PX,
  GATE_ENTER_WIDTH_PX,
  GATE_WHEEL_LINE_PX,
} from '../../src/scene/tuning';
import { energyStyle, gateEnergy, wheelPx } from '../../src/ui/loadingScreen';

/** Below this the Enter button is visibly at rest: its width differs from rest by under a quarter px. */
const VISUAL_REST = 0.25 / (GATE_ENTER_WIDTH_PX * GATE_ENERGY_MAX_SCALE);

const FRAME_MS = 16;

/** A gate energy driven by a fake frame clock: `frames` runs whatever frame is requested, one every 16 ms. */
function harness() {
  let time = 1000;
  let pending: ((time: number) => void) | null = null;
  let requests = 0;
  const drawn: { energy: number; at: number }[] = [];
  const energy = gateEnergy(
    (value) => drawn.push({ energy: value, at: time }),
    (callback) => {
      requests++;
      pending = callback;
      return requests;
    },
    () => {
      pending = null;
    },
    () => time,
  );
  return {
    energy,
    drawn,
    requests: () => requests,
    pending: () => pending !== null,
    current: () => drawn.at(-1)?.energy ?? 0,
    /** Runs frames for `ms`, or until none is requested. */
    frames(ms: number) {
      const end = time + ms;
      while (time < end) {
        time += FRAME_MS;
        const callback = pending;
        pending = null;
        if (!callback) continue;
        callback(time);
      }
    },
  };
}

const notch = wheelPx(100, 0, 800) * GATE_ENERGY_PER_PX;

describe('gate energy', () => {
  it('rises with a wheel event and decays back to rest within about 1 s', () => {
    const h = harness();
    h.energy.add(notch);
    const peak = h.current();
    expect(peak).toBeGreaterThan(0);
    h.frames(1000);
    expect(h.current()).toBeLessThan(VISUAL_REST);
    // And it does settle at 0, with no frame left pending.
    h.frames(2000);
    expect(h.current()).toBe(0);
    expect(h.pending()).toBe(false);
  });

  it('gives more energy for a larger wheel delta than a smaller one', () => {
    const small = harness();
    const large = harness();
    small.energy.add(wheelPx(100, 0, 800) * GATE_ENERGY_PER_PX);
    large.energy.add(wheelPx(400, 0, 800) * GATE_ENERGY_PER_PX);
    expect(large.current()).toBeGreaterThan(small.current());
  });

  it('never exceeds 1 under 100 rapid wheel events', () => {
    const h = harness();
    for (let i = 0; i < 100; i++) {
      h.energy.add(wheelPx(400, 0, 800) * GATE_ENERGY_PER_PX);
      h.frames(FRAME_MS);
    }
    expect(Math.max(...h.drawn.map((d) => d.energy))).toBe(1);
  });

  it('requests no frames at rest, once settled, or after it stops', () => {
    const h = harness();
    h.frames(500);
    expect(h.requests()).toBe(0);

    h.energy.add(notch);
    h.frames(3000);
    expect(h.current()).toBe(0);
    const settled = h.requests();
    h.frames(1000);
    expect(h.requests()).toBe(settled);

    h.energy.add(1);
    h.energy.stop();
    expect(h.current()).toBe(0);
    expect(h.pending()).toBe(false);
    const stopped = h.requests();
    h.frames(1000);
    expect(h.requests()).toBe(stopped);
  });

  it('never grows on a frame whose time comes before the add that woke it', () => {
    let pending: ((time: number) => void) | null = null;
    const drawn: number[] = [];
    const energy = gateEnergy(
      (value) => drawn.push(value),
      (callback) => {
        pending = callback;
        return 1;
      },
      () => {},
      () => 1000,
    );
    energy.add(0.5);
    pending!(990);
    expect(drawn.at(-1)).toBe(0.5);
  });

  it('gives a key press energy, an arrow less than a page key', () => {
    const arrow = harness();
    const page = harness();
    arrow.energy.add(GATE_ENERGY_PER_KEY.arrow);
    page.energy.add(GATE_ENERGY_PER_KEY.page);
    expect(arrow.current()).toBeGreaterThan(0);
    expect(page.current()).toBeGreaterThan(arrow.current());
  });
});

describe('wheelPx', () => {
  it('normalises lines and pages to px, either direction', () => {
    expect(wheelPx(-120, 0, 800)).toBe(120);
    expect(wheelPx(3, 1, 800)).toBe(3 * GATE_WHEEL_LINE_PX);
    expect(wheelPx(1, 2, 800)).toBe(800);
  });
});

describe('energyStyle', () => {
  it('draws nothing at rest', () => {
    expect(energyStyle(0, false)).toBeNull();
  });

  it('scales up to the max and brightens the border at full energy', () => {
    expect(energyStyle(1, false)).toEqual({ transform: `scale(${1 + GATE_ENERGY_MAX_SCALE})`, borderOpacity: 1 });
    expect(energyStyle(0.5, false)?.borderOpacity).toBeCloseTo(0.8);
  });

  it('with reduced motion, leaves the scale at 1 and only brightens the border', () => {
    const style = energyStyle(1, true);
    expect(style?.transform).toBeUndefined();
    expect(style?.borderOpacity).toBe(1);
  });
});

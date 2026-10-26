import { describe, expect, it } from 'vitest';
import { CITY_SIZE } from '../../src/environment/city';
import { CITY_LIGHT } from '../../src/environment/cityLight';
import { createRain, drawRain, dropCount, dropTint, lightIndexAt, stepRain, windAt, type RainField } from '../../src/environment/rain';
import { RAIN_DEPTHS, RAIN_MAX_DROPS, RAIN_WIND } from '../../src/scene/tuning';
import { seeded } from '../../src/visuals/seeded';

const at = (x: number, y: number) => CITY_LIGHT.palette[lightIndexAt(x / CITY_SIZE.width, y / CITY_SIZE.height)];
const shareOf = (field: RainField, depth: keyof typeof RAIN_DEPTHS) => field.drops.filter((d) => d.depth === depth).length;

describe('rain drop count', () => {
  it('is at most 400 at 1920x1080, never more on a larger screen, and fewer with a smaller area or lower quality', () => {
    expect(dropCount(1920, 1080, 'high')).toBe(RAIN_MAX_DROPS);
    expect(RAIN_MAX_DROPS).toBeLessThanOrEqual(400);
    expect(dropCount(3840, 2160, 'high')).toBe(RAIN_MAX_DROPS);
    expect(dropCount(960, 540, 'high')).toBe(RAIN_MAX_DROPS / 4);
    expect(dropCount(390, 844, 'high')).toBeLessThan(dropCount(1366, 768, 'high'));
    expect(dropCount(1920, 1080, 'low')).toBeLessThan(dropCount(1920, 1080, 'high'));
  });

  it('shares the drops among three depths: far ones the most numerous, close ones a few', () => {
    const field = createRain(1920, 1080, 400, seeded(1));
    const far = shareOf(field, 'far');
    const near = shareOf(field, 'near');
    const close = shareOf(field, 'close');
    expect(far + near + close).toBe(400);
    expect(far).toBeGreaterThan(near);
    expect(near).toBeGreaterThan(close);
    expect(close).toBeGreaterThan(0);
    expect(close).toBeLessThanOrEqual(20);
  });
});

describe('rain depths', () => {
  it('far drops are smaller, slower and fainter than near ones; close ones are the largest, quickest and soft', () => {
    const { far, near, close } = RAIN_DEPTHS;
    expect(far.speed[1]).toBeLessThan(near.speed[0]);
    expect(near.speed[1]).toBeLessThan(close.speed[0]);
    expect(far.width).toBeLessThan(near.width);
    expect(near.width).toBeLessThan(close.width);
    expect(far.alpha).toBeLessThan(near.alpha);
    expect(close.soft).toBe(true);
    expect(far.soft || near.soft).toBe(false);
    // The streak's length follows its speed: the faster depth's streaks are longer.
    const length = (d: { speed: readonly number[]; streakSeconds: number }) => d.speed[0] * d.streakSeconds;
    expect(length(far)).toBeLessThan(length(near));
    expect(length(near)).toBeLessThan(length(close));
  });
});

describe('rain wind', () => {
  it('leans the fall a few degrees off vertical, drifting slowly, never more than its drift', () => {
    const degrees = (t: number) => (windAt(t) * 180) / Math.PI;
    let min = Infinity;
    let max = -Infinity;
    for (let t = 0; t < 600; t += 0.25) {
      min = Math.min(min, degrees(t));
      max = Math.max(max, degrees(t));
      // Slow: under a degree in a second.
      expect(Math.abs(degrees(t + 1) - degrees(t))).toBeLessThan(1);
    }
    expect(min).toBeGreaterThanOrEqual(RAIN_WIND.baseDegrees - RAIN_WIND.driftDegrees - 1e-9);
    expect(max).toBeLessThanOrEqual(RAIN_WIND.baseDegrees + RAIN_WIND.driftDegrees + 1e-9);
    expect(max - min).toBeGreaterThan(RAIN_WIND.driftDegrees);
    expect(Math.max(Math.abs(min), Math.abs(max))).toBeLessThan(10);
  });
});

describe('rain falling', () => {
  it('moves each drop down at its own speed, and starts one that has left the view again above it', () => {
    const random = seeded(7);
    const field = createRain(1280, 720, 200, random);
    const before = field.drops.map((d) => ({ ...d }));
    stepRain(field, 1 / 60, random);
    let moved = 0;
    field.drops.forEach((d, i) => {
      if (d.y > before[i].y) {
        moved++;
        // Its own speed, at its own slant: down by about speed / 60.
        expect(d.y - before[i].y).toBeCloseTo((before[i].speed / 60) * Math.cos(windAt(1 / 60) + d.slant), 6);
      } else {
        // Respawned above the top.
        expect(d.y).toBeLessThanOrEqual(0);
      }
    });
    expect(moved).toBeGreaterThan(190);
    // Long enough that every drop has left the view at least once: all are still in play, spread over the view.
    for (let i = 0; i < 600; i++) stepRain(field, 1 / 60, random);
    expect(field.drops).toHaveLength(200);
    expect(field.drops.every((d) => d.y < 720 + 200 && d.y > -400)).toBe(true);
  });

  it('places drops at random: no two share a column or a start, and the columns cover the view evenly', () => {
    const random = seeded(11);
    const field = createRain(1920, 1080, 400, random);
    for (let i = 0; i < 300; i++) stepRain(field, 1 / 60, random);
    const xs = field.drops.map((d) => Math.round(d.x * 10));
    expect(new Set(xs).size).toBeGreaterThan(395);
    // Eight bands across the view, each holding roughly an eighth of the drops: no clumps, no gaps.
    const bands = Array.from({ length: 8 }, () => 0);
    for (const d of field.drops) if (d.x >= 0 && d.x < 1920) bands[Math.floor((d.x / 1920) * 8)]++;
    const mean = bands.reduce((a, b) => a + b, 0) / 8;
    for (const band of bands) expect(Math.abs(band - mean) / mean).toBeLessThan(0.45);
    // Their heights aren't in rows either.
    const ys = new Set(field.drops.map((d) => Math.round(d.y)));
    expect(ys.size).toBeGreaterThan(300);
  });
});

describe("the city's light map, as the rain catches it", () => {
  it('is cyan at DataVista, gold at the Art Deco tower, violet at NeuroInsight-AI, and dark over the sky', () => {
    const [br, bg, bb] = at(380, 560);
    expect(bg).toBeGreaterThan(br * 1.5);
    expect(bb).toBeGreaterThan(br * 1.5);
    const [gr, gg, gb] = at(1020, 600);
    expect(gr).toBeGreaterThan(gg);
    expect(gg).toBeGreaterThan(gb * 1.3);
    const [vr, vg, vb] = at(1700, 700);
    expect(vb).toBeGreaterThan(vg * 2);
    expect(vr).toBeGreaterThan(vg * 1.5);
    expect(dropTint(at(1950, 60)).light).toBe(0);
    expect(dropTint(at(700, 150)).light).toBe(0);
  });

  it('lights a drop only in front of lit areas, in their colour', () => {
    expect(dropTint(at(1020, 600)).light).toBeGreaterThan(0.8);
    expect(dropTint(at(380, 560)).light).toBeGreaterThan(0.5);
    expect(dropTint(at(1700, 700)).light).toBeGreaterThan(0.2);
    expect(dropTint([69, 124, 131]).color).toMatch(/^rgb\(\d+ (2[0-4]\d|25[0-5]) (2[0-4]\d|25[0-5])\)$/);
  });

  it('has one palette digit per cell', () => {
    expect(CITY_LIGHT.cells).toHaveLength(CITY_LIGHT.width * CITY_LIGHT.height);
    expect([...CITY_LIGHT.cells].every((c) => parseInt(c, 36) < CITY_LIGHT.palette.length)).toBe(true);
  });
});

describe('drawing the rain', () => {
  /** A context that counts fills and records the alpha and colour of each. */
  function recorder() {
    const fills: { alpha: number; color: string }[] = [];
    const g = {
      globalAlpha: 1,
      fillStyle: '' as string,
      beginPath() {},
      moveTo() {},
      lineTo() {},
      closePath() {},
      clearRect() {},
      fill() {
        fills.push({ alpha: g.globalAlpha, color: g.fillStyle });
      },
    };
    return { g, fills };
  }
  const whole = { ax: 1 / 1920, bx: 0, ay: 1 / 1080, by: 0 };

  it('fills once per group of drops of one depth and one light, not once per drop', () => {
    const field = createRain(1920, 1080, 400, seeded(3));
    const { g, fills } = recorder();
    drawRain(g as unknown as CanvasRenderingContext2D, field, whole, { far: 1, near: 1, close: 1 });
    expect(fills.length).toBeGreaterThan(3);
    expect(fills.length).toBeLessThan(100);
  });

  it('draws only the depths with any gain: in a crossing, only the near drops', () => {
    const field = createRain(1920, 1080, 400, seeded(3));
    const all = recorder();
    drawRain(all.g as unknown as CanvasRenderingContext2D, field, whole, { far: 1, near: 1, close: 1 });
    const near = recorder();
    drawRain(near.g as unknown as CanvasRenderingContext2D, field, whole, { far: 0, near: 1, close: 0 });
    expect(near.fills.length).toBeGreaterThan(0);
    expect(near.fills.length).toBeLessThan(all.fills.length);
    const none = recorder();
    drawRain(none.g as unknown as CanvasRenderingContext2D, field, whole, { far: 0, near: 0, close: 0 });
    expect(none.fills).toEqual([]);
  });

  it('is nearly invisible against the dark sky and brightest in front of the lit signs', () => {
    const field = createRain(1920, 1080, 400, seeded(5));
    const { g, fills } = recorder();
    drawRain(g as unknown as CanvasRenderingContext2D, field, whole, { far: 1, near: 1, close: 1 });
    const alphas = fills.map((f) => f.alpha);
    expect(Math.min(...alphas)).toBeLessThan(0.08);
    expect(Math.max(...alphas)).toBeLessThan(0.65);
  });
});

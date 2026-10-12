import { describe, expect, it } from 'vitest';
import {
  ambientLevel,
  BACKDROP_MIN_WEIGHT,
  backdropWeight,
  BACKDROPS,
  layerOpacities,
  layerPose,
  motionRunning,
  sectionOpacity,
  starField,
  starKeep,
  worldOpacity,
  type ZoneBackdrop,
} from '../../src/environment/backdrops';
import { ZONE_IDS, ZONE_T, zoneWeight } from '../../src/environment/zones';
import {
  AMBIENT_GAIN,
  LAYER_PUSH_PX,
  LAYER_PUSH_SCALE,
  LAYER_REST_SCALE,
  PARALLAX_MAX_X_PX,
  PARALLAX_MAX_Y_PX,
  STAR_COLOR,
  STAR_GLOW_CLEAR_HALF_WIDTH,
  STAR_GLOW_FADE_WIDTH,
  STAR_PERIOD_SECONDS,
  STAR_SEED,
  STAR_SKY_FRACTION,
  STAR_TIERS,
  SWEEP_PEAK_GAIN,
} from '../../src/scene/tuning';
import { SECTION_IDS } from '../../src/sections/contract';

const backdrop = (zone: ZoneBackdrop['zone']): ZoneBackdrop => ({
  zone,
  layers: [{ src: `${zone}.webp`, depth: 1 }],
  horizon: 0.5,
  focusX: 0.5,
  portraitFocusX: 0.5,
  effects: [],
});

describe('the backdrop registry', () => {
  it('has at most one backdrop per zone', () => {
    const zones = BACKDROPS.map((b) => b.zone);
    expect(new Set(zones).size).toBe(zones.length);
  });

  it('starts with the landing world', () => {
    expect(BACKDROPS.map((b) => b.zone)).toEqual(['landing']);
  });
});

describe('backdropWeight', () => {
  it('is the zone weight', () => {
    for (const t of [0, 0.02, ZONE_T.about / 2]) expect(backdropWeight(t, 'landing')).toBe(zoneWeight(t, 'landing'));
  });

  it('is exactly 0 just short of About, where the eased camera settles but never quite arrives', () => {
    const almost = ZONE_T.about - 1e-6;
    expect(zoneWeight(almost, 'landing')).toBeGreaterThan(0);
    expect(backdropWeight(almost, 'landing')).toBe(0);
  });

  it('snaps only weights below the cutoff', () => {
    let t = ZONE_T.about / 2;
    while (zoneWeight(t, 'landing') >= BACKDROP_MIN_WEIGHT) t += 1e-5;
    expect(backdropWeight(t - 1e-5, 'landing')).toBeGreaterThanOrEqual(BACKDROP_MIN_WEIGHT);
    expect(backdropWeight(t, 'landing')).toBe(0);
  });
});

describe('worldOpacity', () => {
  const landing = [backdrop('landing')];

  it('draws no dome or grid at the landing point', () => {
    expect(worldOpacity(0, landing)).toBe(0);
  });

  it('draws them fully from About on, where the landing has no weight', () => {
    for (const id of ZONE_IDS.slice(1)) expect(worldOpacity(ZONE_T[id], landing)).toBe(1);
    expect(worldOpacity(1, landing)).toBe(1);
  });

  it('is what the landing backdrop leaves, all the way from the landing to About', () => {
    for (let i = 0; i <= 20; i++) {
      const t = (ZONE_T.about * i) / 20;
      const opacity = worldOpacity(t, landing);
      expect(opacity).toBeCloseTo(1 - backdropWeight(t, 'landing'));
      expect(opacity).toBeGreaterThanOrEqual(0);
      expect(opacity).toBeLessThanOrEqual(1);
    }
  });

  it('rises steadily as the landing backdrop fades', () => {
    let previous = -1;
    for (let i = 0; i <= 40; i++) {
      const opacity = worldOpacity((ZONE_T.about * i) / 40, landing);
      expect(opacity).toBeGreaterThanOrEqual(previous);
      previous = opacity;
    }
  });

  it('is 1 everywhere with no backdrops', () => {
    for (const t of [0, 0.05, ZONE_T.about, 1]) expect(worldOpacity(t, [])).toBe(1);
  });

  it('gives way to neighbouring backdrops together, never below 0', () => {
    const both = [backdrop('landing'), backdrop('about')];
    for (let i = 0; i <= 20; i++) expect(worldOpacity((ZONE_T.about * i) / 20, both)).toBeCloseTo(0);
    expect(worldOpacity(ZONE_T.projects, both)).toBe(1);
  });
});

describe('sectionOpacity', () => {
  const landing = [backdrop('landing')];

  it('hides every section at the landing point', () => {
    for (const id of SECTION_IDS) expect(sectionOpacity(0, id, landing)).toBe(0);
  });

  it('shows About partly halfway to it', () => {
    const opacity = sectionOpacity(ZONE_T.about / 2, 'about', landing);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
  });

  it('fades in together with the dome, all the way from the landing to About', () => {
    for (let i = 0; i <= 40; i++) {
      const t = (ZONE_T.about * i) / 40;
      for (const id of SECTION_IDS) expect(sectionOpacity(t, id, landing)).toBe(worldOpacity(t, landing));
    }
  });

  it('changes by small steps only, with no popping', () => {
    const steps = 400;
    for (const id of SECTION_IDS) {
      let previous = sectionOpacity(0, id, landing);
      for (let i = 1; i <= steps; i++) {
        const opacity = sectionOpacity((ZONE_T.about * i) / steps, id, landing);
        expect(Math.abs(opacity - previous)).toBeLessThan(0.02);
        previous = opacity;
      }
    }
  });

  it('leaves every section fully drawn from About on, where only grey zones have weight', () => {
    for (const id of SECTION_IDS) {
      for (const zone of ZONE_IDS.slice(1)) expect(sectionOpacity(ZONE_T[zone], id, landing)).toBe(1);
      for (let i = 0; i <= 20; i++) expect(sectionOpacity(ZONE_T.about + ((1 - ZONE_T.about) * i) / 20, id, landing)).toBe(1);
    }
  });

  it('is 1 everywhere with no backdrops', () => {
    for (const t of [0, 0.05, ZONE_T.about, 1]) for (const id of SECTION_IDS) expect(sectionOpacity(t, id, [])).toBe(1);
  });

  it('does not hide a section over its own zone backdrop, only the others', () => {
    const projects = [backdrop('projects')];
    expect(sectionOpacity(ZONE_T.projects, 'projects', projects)).toBe(1);
    for (const id of SECTION_IDS.filter((id) => id !== 'projects')) expect(sectionOpacity(ZONE_T.projects, id, projects)).toBe(0);
  });
});

describe('layerOpacities', () => {
  /** What each backdrop and the dome add to the final picture: layers composited in order, the dome over them. */
  function contributions(weights: number[], dome: number) {
    const opacities = layerOpacities(weights);
    const layers = weights.map(() => 0);
    let background = 1;
    opacities.forEach((a, i) => {
      for (let j = 0; j < i; j++) layers[j] *= 1 - a;
      background *= 1 - a;
      layers[i] = a;
    });
    return { layers: layers.map((v) => v * (1 - dome)), background: background * (1 - dome), dome };
  }

  it('shows one backdrop fully wherever it has weight, so the dome alone carries the fade', () => {
    expect(layerOpacities([1])).toEqual([1]);
    expect(layerOpacities([0.3])).toEqual([1]);
    expect(layerOpacities([0])).toEqual([0]);
  });

  it('shows the backdrop at exactly its weight between the landing and About, with no page background showing', () => {
    const landing = [backdrop('landing')];
    for (let i = 0; i <= 20; i++) {
      const t = (ZONE_T.about * i) / 20;
      const weight = backdropWeight(t, 'landing');
      const { layers, background, dome } = contributions([weight], worldOpacity(t, landing));
      expect(layers[0]).toBeCloseTo(weight);
      expect(dome).toBeCloseTo(1 - weight);
      expect(background).toBeCloseTo(weight > 0 ? 0 : 1 - dome);
    }
  });

  it('leaves no page background anywhere on the path, around the snap to 0 and the landing point included', () => {
    const ts: number[] = [];
    for (let i = 0; i <= 10_000; i++) ts.push(i / 10_000);
    // Where the landing weight crosses the snap, approached from both sides, and the eased camera's last steps home.
    let lo = 0;
    let hi = ZONE_T.about;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (zoneWeight(mid, 'landing') >= BACKDROP_MIN_WEIGHT) lo = mid;
      else hi = mid;
    }
    ts.push(lo, hi, lo - 1e-12, hi + 1e-12, 1e-6, 1e-9, 1e-12, Number.MIN_VALUE);
    for (const t of ts) {
      const weights = BACKDROPS.map(({ zone }) => backdropWeight(t, zone));
      const { layers, background, dome } = contributions(weights, worldOpacity(t));
      expect(background, `background at t=${t}`).toBeLessThan(1e-9);
      expect(dome + layers.reduce((a, b) => a + b, 0), `cover at t=${t}`).toBeCloseTo(1, 9);
    }
  });

  it('mixes neighbouring backdrops by their weights', () => {
    const { layers, background, dome } = contributions([0.25, 0.5], 0.25);
    expect(layers[0]).toBeCloseTo(0.25);
    expect(layers[1]).toBeCloseTo(0.5);
    expect(dome + background + layers[0] + layers[1]).toBeCloseTo(1);
    expect(background).toBeCloseTo(0);
  });
});

describe('the landing backdrop', () => {
  it('is a far base image and a near ground image, with mist and stars', () => {
    const [landing] = BACKDROPS;
    expect(landing.layers.map((l) => l.depth)).toEqual([0.3, 1]);
    expect(landing.effects).toEqual(['mist', 'stars']);
    expect(landing.horizon).toBeCloseTo(725 / 1152, 3);
  });
});

describe('motionRunning', () => {
  it('runs only with weight, no page open, a visible tab and no reduced motion', () => {
    expect(motionRunning(1, false, false, false)).toBe(true);
    expect(motionRunning(0.01, false, false, false)).toBe(true);
    expect(motionRunning(0, false, false, false)).toBe(false);
    expect(motionRunning(1, true, false, false)).toBe(false);
    expect(motionRunning(1, false, true, false)).toBe(false);
    expect(motionRunning(1, false, false, true)).toBe(false);
  });
});

describe('layerPose', () => {
  const W = 1366;
  const H = 768;

  it('rests unmoved at full weight with the pointer in the middle, scaled by depth', () => {
    const pose = layerPose(1, 1, 0, 0, 0.5, W, H);
    expect(Math.abs(pose.x) + Math.abs(pose.y)).toBe(0);
    expect(pose.scale).toBe(LAYER_REST_SCALE);
    expect(layerPose(0.3, 1, 0, 0, 0.5, W, H).scale).toBeCloseTo(1 + 0.3 * (LAYER_REST_SCALE - 1));
  });

  it('shifts against the pointer, up to the depth-scaled maximum', () => {
    const pose = layerPose(1, 1, 1, 1, 0.5, W, H);
    expect(pose.x).toBe(-PARALLAX_MAX_X_PX);
    expect(pose.y).toBe(-PARALLAX_MAX_Y_PX);
    expect(layerPose(0.3, 1, -1, 0, 0.5, W, H).x).toBeCloseTo(0.3 * PARALLAX_MAX_X_PX);
  });

  it('moves down and grows as the weight falls to 0', () => {
    const away = layerPose(1, 0, 0, 0, 0.5, W, H);
    expect(away.y).toBe(LAYER_PUSH_PX);
    expect(away.scale).toBeGreaterThanOrEqual(LAYER_PUSH_SCALE);
    expect(layerPose(1, 0.5, 0, 0, 0.5, W, H).y).toBeCloseTo(LAYER_PUSH_PX / 2);
  });

  it('never leaves an edge showing, on any screen and in any pose', () => {
    for (const [width, height] of [[1920, 1080], [1366, 768], [400, 700], [390, 844], [320, 480]]) {
      for (const depth of [0.3, 1]) {
        for (const weight of [0, 0.5, 1]) {
          for (const [px, py] of [[-1, -1], [1, 1], [-1, 1], [1, -1], [0, 0]]) {
            const horizon = 0.629;
            const { x, y, scale } = layerPose(depth, weight, px, py, horizon, width, height);
            // The scaled box about (50%, horizon), then moved: it still covers the view.
            const left = (width / 2) * (1 - scale) + x;
            const right = width / 2 + (width / 2) * scale + x;
            const top = horizon * height * (1 - scale) + y;
            const bottom = horizon * height + (1 - horizon) * height * scale + y;
            expect(left).toBeLessThanOrEqual(1e-9);
            expect(right).toBeGreaterThanOrEqual(width - 1e-9);
            expect(top).toBeLessThanOrEqual(1e-9);
            expect(bottom).toBeGreaterThanOrEqual(height - 1e-9);
          }
        }
      }
    }
  });
});

describe('starField', () => {
  const [landing] = BACKDROPS;
  const field = (seed?: number) => starField(landing.horizon, landing.focusX, seed);
  const tier = (name: keyof typeof STAR_TIERS) => field().filter((star) => star.tier === name);

  it('gives the same stars for the same seed, every time', () => {
    expect(field(STAR_SEED)).toEqual(field(STAR_SEED));
    expect(field()).toEqual(field(STAR_SEED));
    expect(field(STAR_SEED + 1)).not.toEqual(field(STAR_SEED));
  });

  it('has about 140 stars: three quarters tiny, a fifth medium, the rest bright', () => {
    const total = field().length;
    expect(total).toBeGreaterThanOrEqual(130);
    expect(total).toBeLessThanOrEqual(150);
    for (const name of ['tiny', 'medium', 'bright'] as const) expect(tier(name)).toHaveLength(STAR_TIERS[name].count);
    expect(tier('tiny').length / total).toBeCloseTo(0.75, 1);
    expect(tier('medium').length / total).toBeCloseTo(0.2, 1);
    expect(tier('bright').length / total).toBeCloseTo(0.05, 1);
  });

  it('keeps each tier to its size and opacity, and only the medium and bright stars twinkle', () => {
    for (const name of ['tiny', 'medium', 'bright'] as const) {
      const { sizePx, opacity, twinkles } = STAR_TIERS[name];
      for (const star of tier(name)) {
        expect(star.size).toBeGreaterThanOrEqual(sizePx[0]);
        expect(star.size).toBeLessThanOrEqual(sizePx[1]);
        expect(star.twinkles).toBe(twinkles);
        if (twinkles) {
          expect([star.min, star.max]).toEqual(opacity);
          expect(star.period).toBeGreaterThanOrEqual(STAR_PERIOD_SECONDS[0]);
          expect(star.period).toBeLessThanOrEqual(STAR_PERIOD_SECONDS[1]);
          expect(star.phase).toBeGreaterThanOrEqual(0);
          expect(star.phase).toBeLessThan(1);
        } else {
          expect(star.min).toBe(star.max);
          expect(star.max).toBeGreaterThanOrEqual(opacity[0]);
          expect(star.max).toBeLessThanOrEqual(opacity[1]);
        }
      }
    }
    expect(tier('tiny').map((s) => s.size)).toEqual(tier('tiny').map(() => 1));
    expect(tier('medium').map((s) => s.size)).toEqual(tier('medium').map(() => 1.5));
    const twinkling = field().filter((s) => s.twinkles);
    expect(new Set(twinkling.map((s) => s.period)).size).toBe(twinkling.length);
  });

  it('tints a few bright stars slightly warm or blue, and no others', () => {
    const tinted = field().filter((s) => s.color !== STAR_COLOR);
    expect(tinted.length).toBeGreaterThan(0);
    expect(tinted.length).toBeLessThan(tier('bright').length);
    for (const star of tinted) expect(star.tier).toBe('bright');
  });

  it('fills the sky from the top, thinning toward the horizon, with none in its lowest part', () => {
    const sky = landing.horizon;
    const stars = field();
    for (const star of stars) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThan(1);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThan(STAR_SKY_FRACTION * sky);
    }
    const band = (from: number, to: number) => stars.filter((s) => s.y >= from * sky && s.y < to * sky).length;
    expect(band(0, 0.25)).toBeGreaterThan(band(0.25, 0.5));
    expect(band(0.25, 0.5)).toBeGreaterThan(band(0.5, 0.85));
  });

  it("thins out around the glow's centre column, to none at its middle", () => {
    const glow = landing.focusX;
    expect(starKeep(glow, glow)).toBe(0);
    expect(starKeep(glow + STAR_GLOW_CLEAR_HALF_WIDTH + STAR_GLOW_FADE_WIDTH / 2, glow)).toBeCloseTo(0.5);
    expect(starKeep(glow - STAR_GLOW_CLEAR_HALF_WIDTH - STAR_GLOW_FADE_WIDTH, glow)).toBe(1);
    const stars = field();
    for (const star of stars) expect(Math.abs(star.x - glow)).toBeGreaterThan(STAR_GLOW_CLEAR_HALF_WIDTH);
    const near = stars.filter((s) => Math.abs(s.x - glow) < STAR_GLOW_CLEAR_HALF_WIDTH + STAR_GLOW_FADE_WIDTH).length;
    const width = 2 * STAR_GLOW_FADE_WIDTH;
    // Fewer per unit of width beside the cleared column than across the rest of the sky.
    expect(near / width).toBeLessThan((stars.length - near) / (1 - 2 * (STAR_GLOW_CLEAR_HALF_WIDTH + STAR_GLOW_FADE_WIDTH)));
  });
});

describe('ambientLevel', () => {
  it('follows the zone weight up to the peak gain', () => {
    expect(ambientLevel(0, false)).toBe(0);
    expect(ambientLevel(0.5, false)).toBeCloseTo(AMBIENT_GAIN / 2);
    expect(ambientLevel(1, false)).toBeCloseTo(AMBIENT_GAIN);
    expect(ambientLevel(1, false, 0.3)).toBeCloseTo(0.3);
  });

  it('is 0 under an open page, at any weight', () => {
    for (const weight of [0, 0.4, 1]) expect(ambientLevel(weight, true)).toBe(0);
  });

  it('stays within 0 and the peak for weights out of range', () => {
    expect(ambientLevel(-0.2, false)).toBe(0);
    expect(ambientLevel(1.5, false)).toBeCloseTo(AMBIENT_GAIN);
  });

  it('fades from the landing to About with the landing weight', () => {
    expect(ambientLevel(zoneWeight(0, 'landing'), false)).toBeCloseTo(AMBIENT_GAIN);
    expect(ambientLevel(zoneWeight(ZONE_T.about, 'landing'), false)).toBe(0);
  });

  it('peaks under the fly-in sweep', () => {
    expect(AMBIENT_GAIN).toBeLessThan(SWEEP_PEAK_GAIN);
  });
});

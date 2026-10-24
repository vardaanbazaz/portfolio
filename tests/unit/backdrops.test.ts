import { describe, expect, it } from 'vitest';
import {
  ambientLevel,
  BACKDROP_MIN_WEIGHT,
  backdropVisibility,
  backdropWeight,
  BACKDROPS,
  bloomAt,
  bloomRise,
  coverPoint,
  crossingAt,
  effectsShown,
  FIRST_BACKDROP,
  layerOpacities,
  layerPose,
  motionRunning,
  moteField,
  objectBox,
  objectRestBox,
  objectTop,
  posePoint,
  sectionOpacity,
  starField,
  starKeep,
  thresholdAt,
  worldOpacity,
  type Readiness,
  type ZoneBackdrop,
} from '../../src/environment/backdrops';
import baseFile from '../../src/environment/assets/about-base.webp?inline';
import glowFile from '../../src/environment/assets/about-stone-glow.webp?inline';
import outlineFile from '../../src/environment/assets/about-stone-outline.webp?inline';
import { ZONE_IDS, ZONE_T, zoneWeight } from '../../src/environment/zones';
import {
  AMBIENT_GAIN,
  BLOOM_EDGE_MAX,
  BLOOM_PEAK,
  BLOOM_RADIUS,
  BLOOM_STOPS,
  CROSSING_SWAP_HALF_WIDTH,
  EFFECTS_MIN_WEIGHT,
  LAYER_PUSH_PX,
  LAYER_PUSH_SCALE,
  LAYER_REST_SCALE,
  MOTE_COUNT,
  MOTE_LOWEST,
  MOTE_OPACITY,
  MOTE_SIZE_PX,
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
  size: { width: 2048, height: 1152 },
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

  it('has the landing world, then the About grove', () => {
    expect(BACKDROPS.map((b) => b.zone)).toEqual(['landing', 'about']);
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

  it('is 0 for a world whose images have not come in, and rises with its readiness', () => {
    const notIn: Readiness = (zone) => (zone === 'about' ? 0 : 1);
    const half: Readiness = (zone) => (zone === 'about' ? 0.5 : 1);
    expect(backdropWeight(ZONE_T.about, 'about', undefined, notIn)).toBe(0);
    expect(backdropWeight(ZONE_T.about, 'about', undefined, half)).toBe(0.5);
    expect(backdropWeight(0, 'landing', undefined, notIn)).toBe(1);
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

  it('is exactly 0, so nothing of the dome or grid is drawn, at 20 points between the landing and About', () => {
    for (let i = 0; i <= 20; i++) expect(worldOpacity((ZONE_T.about * i) / 20)).toBe(0);
    // And where the eased camera settles near either end, and around the swap.
    for (const t of [1e-9, 1e-4, ZONE_T.about - 1e-4, ZONE_T.about - 1e-9, ZONE_T.about / 2 - 1e-7, ZONE_T.about / 2 + 1e-7]) {
      expect(worldOpacity(t)).toBe(0);
    }
  });

  it('rises again from About to Projects, which has no backdrop', () => {
    const mid = (ZONE_T.about + ZONE_T.projects) / 2;
    expect(worldOpacity(mid)).toBeCloseTo(0.5);
    expect(worldOpacity(ZONE_T.projects)).toBe(1);
  });
});

describe('a world whose images have not come in', () => {
  const notIn: Readiness = (zone) => (zone === 'about' ? 0 : 1);

  it('leaves the path as it was before that world had a backdrop: the dome, and the About grey box, show', () => {
    const before = [BACKDROPS[0]];
    for (const t of [ZONE_T.about / 2, ZONE_T.about, (ZONE_T.about + ZONE_T.projects) / 2]) {
      expect(worldOpacity(t, undefined, undefined, notIn)).toBeCloseTo(worldOpacity(t, before), 12);
      expect(sectionOpacity(t, 'about', undefined, undefined, notIn)).toBeCloseTo(sectionOpacity(t, 'about', before), 12);
      expect(backdropVisibility(t, 'landing', undefined, undefined, notIn)).toBe(backdropWeight(t, 'landing'));
      expect(backdropVisibility(t, 'about', undefined, undefined, notIn)).toBe(0);
    }
    expect(worldOpacity(ZONE_T.about, undefined, undefined, notIn)).toBe(1);
  });

  it('has no crossing and no bloom', () => {
    expect(crossingAt(ZONE_T.about / 2, undefined, undefined, notIn)).toBeNull();
    expect(bloomAt(ZONE_T.about / 2, 1920, 1080, undefined, undefined, notIn)).toBeNull();
  });

  it('fades in from there: half in, the pictures and the dome still cover the view between them', () => {
    const half: Readiness = (zone) => (zone === 'about' ? 0.5 : 1);
    for (let i = 0; i <= 20; i++) {
      const t = (ZONE_T.about * i) / 20;
      const shown = backdropVisibility(t, 'landing', undefined, undefined, half) + backdropVisibility(t, 'about', undefined, undefined, half);
      expect(shown + worldOpacity(t, undefined, undefined, half)).toBeGreaterThanOrEqual(1 - 1e-9);
    }
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

  it('hides About wherever the grove has weight: the stone stands in for its grey box', () => {
    for (let i = 0; i <= 20; i++) expect(sectionOpacity((ZONE_T.about * i) / 20, 'about')).toBe(0);
    expect(sectionOpacity((ZONE_T.about + ZONE_T.projects) / 2, 'about')).toBeCloseTo(0.5);
    expect(sectionOpacity(ZONE_T.projects, 'about')).toBe(1);
  });

  it('hides every section on the way from the landing to About, and Projects until the grove fades', () => {
    for (let i = 0; i <= 20; i++) for (const id of SECTION_IDS) expect(sectionOpacity((ZONE_T.about * i) / 20, id)).toBe(0);
    expect(sectionOpacity(ZONE_T.projects, 'projects')).toBe(1);
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
      const weights = BACKDROPS.map(({ zone }) => backdropVisibility(t, zone));
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

  it('is the first world: the one the loading screen waits for', () => {
    expect(FIRST_BACKDROP.zone).toBe('landing');
  });

  it("has its light at the dawn glow's centre, on the horizon", () => {
    expect(BACKDROPS[0].sun).toEqual({ x: BACKDROPS[0].focusX, y: BACKDROPS[0].horizon });
  });
});

describe('effectsShown', () => {
  it(`draws a world's effects only from ${EFFECTS_MIN_WEIGHT} of weight up`, () => {
    expect(effectsShown(0)).toBe(false);
    expect(effectsShown(EFFECTS_MIN_WEIGHT - 1e-9)).toBe(false);
    expect(effectsShown(EFFECTS_MIN_WEIGHT)).toBe(true);
    expect(effectsShown(1)).toBe(true);
  });
});

describe('the crossing between the landing and the grove', () => {
  const at = (u: number) => ZONE_T.about * u;

  it('lies between two zones that both have a backdrop, and nowhere else', () => {
    expect(thresholdAt(at(0.25))).toEqual({ from: 'landing', to: 'about', u: expect.closeTo(0.25, 9) });
    for (const t of [0, ZONE_T.about, (ZONE_T.about + ZONE_T.projects) / 2, 1]) expect(thresholdAt(t)).toBeNull();
    expect(thresholdAt(at(0.5), [backdrop('landing')])).toBeNull();
  });

  it('begins once the grove has weight and ends once the landing has none, though the camera never quite arrives', () => {
    expect(crossingAt(at(0.5))).toEqual({ from: 'landing', to: 'about', u: expect.closeTo(0.5, 9), ready: 1 });
    for (const t of [0, 1e-9, at(1e-3), ZONE_T.about - 1e-9, ZONE_T.about]) expect(crossingAt(t)).toBeNull();
  });

  it('crossfades the pictures over CROSSING_SWAP_HALF_WIDTH each side of the midpoint, the two always summing to 1', () => {
    for (let i = 0; i <= 200; i++) {
      const t = at(i / 200);
      const landing = backdropVisibility(t, 'landing');
      const grove = backdropVisibility(t, 'about');
      expect(landing + grove).toBeCloseTo(1, 2);
      if (crossingAt(t)) expect(landing + grove).toBeCloseTo(1, 12);
      if (landing > 0 && grove > 0 && crossingAt(t)) expect(Math.abs(i / 200 - 0.5)).toBeLessThanOrEqual(CROSSING_SWAP_HALF_WIDTH);
    }
    expect(backdropVisibility(at(0.5 - CROSSING_SWAP_HALF_WIDTH), 'landing')).toBe(1);
    expect(backdropVisibility(at(0.5), 'landing')).toBeCloseTo(0.5, 9);
    expect(backdropVisibility(at(0.5 + CROSSING_SWAP_HALF_WIDTH), 'about')).toBe(1);
  });

  it('leaves the walk-away weights as they were, spread over the whole stretch', () => {
    for (const u of [0.1, 0.3, 0.5, 0.7, 0.9]) expect(backdropWeight(at(u), 'landing')).toBe(zoneWeight(at(u), 'landing'));
  });
});

describe('the dawn bloom', () => {
  const at = (u: number) => ZONE_T.about * u;
  const grove = BACKDROPS.find((b) => b.zone === 'about')!;
  const SCREENS = [[1920, 1080], [1366, 768], [1280, 720], [390, 844]] as const;

  /** The bloom's light at a share s of its radius from its centre, as the CSS gradient draws it (linear between stops). */
  function light(s: number) {
    if (s >= 1) return 0;
    for (let i = 1; i < BLOOM_STOPS.length; i++) {
      const [a, , alphaA] = BLOOM_STOPS[i - 1];
      const [b, , alphaB] = BLOOM_STOPS[i];
      if (s <= b) return alphaA + ((alphaB - alphaA) * (s - a)) / (b - a);
    }
    return 0;
  }

  it('is exactly 0 at both stops, and wherever the eased camera settles near them', () => {
    for (const t of [0, 1e-9, at(1e-3), ZONE_T.about - 1e-9, ZONE_T.about, ZONE_T.projects]) expect(bloomAt(t, 1920, 1080)).toBeNull();
    expect(bloomRise(0)).toBe(0);
    expect(bloomRise(1)).toBe(0);
  });

  it('peaks at BLOOM_PEAK at the midpoint, rising before it and falling after it', () => {
    expect(bloomAt(at(0.5), 1920, 1080)!.opacity).toBeCloseTo(BLOOM_PEAK, 9);
    let previous = 0;
    for (let i = 2; i <= 100; i++) {
      const opacity = bloomAt(at(i / 200), 1920, 1080)?.opacity ?? 0;
      expect(opacity).toBeGreaterThanOrEqual(previous);
      previous = opacity;
    }
    for (let i = 101; i <= 198; i++) {
      const opacity = bloomAt(at(i / 200), 1920, 1080)?.opacity ?? 0;
      expect(opacity).toBeLessThanOrEqual(previous);
      previous = opacity;
    }
  });

  it("grows from the landing's dawn glow to 0.9 of the view's width at the midpoint, and ends on the grove's sun", () => {
    for (const [W, H] of SCREENS) {
      const start = bloomAt(at(0.03), W, H)!;
      const [gx, gy] = coverPoint(BACKDROPS[0], BACKDROPS[0].sun!, W, H);
      expect(Math.hypot(start.x - gx, start.y - gy)).toBeLessThan(0.01 * W);
      expect(bloomAt(at(0.5), W, H)!.radius).toBeCloseTo(BLOOM_RADIUS.mid * W, 6);
      expect(BLOOM_RADIUS.mid).toBe(0.9);
      const end = bloomAt(at(0.97), W, H)!;
      const [sx, sy] = coverPoint(grove, grove.sun!, W, H);
      expect(Math.hypot(end.x - sx, end.y - sy)).toBeLessThan(0.01 * W);
      expect(end.radius).toBeLessThan(0.15 * W);
    }
  });

  it(`adds at most ${BLOOM_EDGE_MAX} anywhere on the edges of the view, so silhouettes show through it`, () => {
    for (const [W, H] of SCREENS) {
      let most = 0;
      for (let i = 1; i < 200; i++) {
        const bloom = bloomAt(at(i / 200), W, H);
        if (!bloom) continue;
        const edge: [number, number][] = [];
        for (let x = 0; x <= W; x += 4) edge.push([x, 0], [x, H]);
        for (let y = 0; y <= H; y += 4) edge.push([0, y], [W, y]);
        for (const [x, y] of edge) most = Math.max(most, bloom.opacity * light(Math.hypot(x - bloom.x, y - bloom.y) / bloom.radius));
      }
      expect(most, `${W}x${H}`).toBeLessThanOrEqual(BLOOM_EDGE_MAX);
    }
  });

  it('is warm white at its centre, through amber, to transparent', () => {
    expect(BLOOM_STOPS[0]).toEqual([0, expect.any(String), 1]);
    expect(BLOOM_STOPS.at(-1)).toEqual([1, expect.any(String), 0]);
    const [r, g, b] = BLOOM_STOPS[0][1].split(' ').map(Number);
    expect(Math.min(r, g, b)).toBeGreaterThan(220);
    for (const [, rgb] of BLOOM_STOPS.slice(1)) {
      const [r1, g1, b1] = rgb.split(' ').map(Number);
      expect(r1).toBeGreaterThan(g1);
      expect(g1).toBeGreaterThan(b1);
    }
  });
});

describe('the grove and its painted stone', () => {
  const stone = grove().objects![0];
  function grove() {
    return BACKDROPS.find((b) => b.zone === 'about')!;
  }

  it('is the grove image, 2048 wide, the size its file is', () => {
    expect(webpSize(baseFile)).toEqual(grove().size);
    expect(grove().size.width).toBe(2048);
  });

  it('has one painted object, standing for the About marker', () => {
    expect(grove().objects).toHaveLength(1);
    expect(stone.kind).toBe('painted');
    expect(stone.marker).toBe('about');
  });

  it('is painted in its layer: at that layer\'s depth', () => {
    for (const b of BACKDROPS) for (const object of b.objects ?? []) expect(b.layers.map((l) => l.depth)).toContain(object.depth);
  });

  it("has masks of its rect's size in the grove's px, traced on its pixels", () => {
    const { width, height } = grove().size;
    const px = { width: Math.round(stone.rect.width * width), height: Math.round(stone.rect.height * height) };
    expect(stone.rect.width * width).toBeCloseTo(px.width, 6);
    expect(stone.rect.height * height).toBeCloseTo(px.height, 6);
    expect(webpSize(outlineFile)).toEqual(px);
    expect(webpSize(glowFile)).toEqual(px);
    expect(stone.rect.x * width).toBeCloseTo(Math.round(stone.rect.x * width), 6);
    expect(stone.rect.y * height).toBeCloseTo(Math.round(stone.rect.y * height), 6);
  });

  it("has its top on its rect's top row, over the stone's own columns, and its bloom inside its rect", () => {
    const { rect, top, glow } = stone;
    expect(top.y).toBeCloseTo(rect.y, 12);
    expect(top.x).toBeGreaterThan(rect.x + 0.3 * rect.width);
    expect(top.x).toBeLessThan(rect.x + 0.7 * rect.width);
    const { bloom } = glow!;
    expect(bloom.x - bloom.rx).toBeGreaterThanOrEqual(0);
    expect(bloom.x + bloom.rx).toBeLessThanOrEqual(1);
    expect(bloom.y - bloom.ry).toBeGreaterThanOrEqual(0);
    expect(bloom.y + bloom.ry).toBeLessThanOrEqual(1);
  });

  it("puts its box on its rect, by the CSS cover crop's own rule", () => {
    for (const [width, height] of [[1920, 1080], [1366, 768], [1280, 720], [2560, 1080], [390, 844]]) {
      const box = objectRestBox(grove(), stone, width, height);
      const [left, top] = coverPoint(grove(), stone.rect, width, height);
      expect(box.left).toBeCloseTo(left, 9);
      expect(box.top).toBeCloseTo(top, 9);
      const scale = Math.max(width / grove().size.width, height / grove().size.height);
      expect(box.width).toBeCloseTo(stone.rect.width * grove().size.width * scale, 9);
      expect(box.height).toBeCloseTo(stone.rect.height * grove().size.height * scale, 9);
    }
  });

  it('keeps the horizon row at its own height of the view, as the CSS does', () => {
    for (const [width, height] of [[1920, 1080], [390, 844], [2560, 1080]]) {
      expect(coverPoint(grove(), { x: 0.5, y: grove().horizon }, width, height)[1]).toBeCloseTo(grove().horizon * height, 9);
    }
  });

  it('moves exactly as the picture it is painted in, in any pose, whatever the camera', () => {
    const W = 1366;
    const H = 768;
    for (const weight of [0, 0.4, 1]) {
      for (const [px, py] of [[-1, -1], [1, 1], [0, 0], [0.3, -0.7]]) {
        const pose = layerPose(stone.depth, weight, px, py, grove().horizon, W, H);
        const box = objectBox(grove(), stone, pose, W, H);
        const corner = posePoint(coverPoint(grove(), stone.rect, W, H), pose, grove().horizon, W, H);
        expect(box.left).toBeCloseTo(corner[0], 9);
        expect(box.top).toBeCloseTo(corner[1], 9);
        const top = objectTop(grove(), stone, pose, W, H);
        const painted = posePoint(coverPoint(grove(), stone.top, W, H), pose, grove().horizon, W, H);
        expect(top[0]).toBeCloseTo(painted[0], 9);
        expect(top[1]).toBeCloseTo(painted[1], 9);
      }
    }
  });

  it('stands left of centre on wide screens, in front of the horizon', () => {
    expect(stone.rect.x + stone.rect.width).toBeLessThan(0.5);
    expect(stone.rect.y).toBeLessThan(grove().horizon);
    expect(stone.rect.y + stone.rect.height).toBeGreaterThan(grove().horizon);
  });

  it('keeps the mist off the stone: whole only left of it, gone before it', () => {
    const [, gone] = grove().mistFade!;
    for (const [W, H] of [[1920, 1080], [1366, 768], [1280, 720], [390, 844]]) {
      const box = objectBox(grove(), stone, layerPose(stone.depth, 1, 0, 0, grove().horizon, W, H), W, H);
      // The stone's left edge at the horizon is a fifth of its rect in from the rect's left (the plinth is wider).
      expect(gone * W).toBeLessThan(box.left + 0.15 * box.width);
    }
  });

  it("gathers the motes on the sun's side: the sun is left of the stone, and the stone left of centre", () => {
    expect(grove().sun!.x).toBeLessThan(stone.rect.x);
    expect(grove().sun!.y).toBeLessThan(grove().horizon);
  });

  it('keeps the whole stone in view on a 390x844 phone, its top clear of the edges for its marker', () => {
    const W = 390;
    const H = 844;
    const box = objectBox(grove(), stone, layerPose(stone.depth, 1, 0, 0, grove().horizon, W, H), W, H);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.left + box.width).toBeLessThanOrEqual(W);
    expect(box.top + box.height).toBeLessThanOrEqual(H);
    const [x] = objectTop(grove(), stone, layerPose(stone.depth, 1, 0, 0, grove().horizon, W, H), W, H);
    expect(x).toBeGreaterThan(60);
    expect(x).toBeLessThan(W - 60);
    // Right of the caption's title ("About", 16 to about 90 px from the left), which its plinth's foot is level with.
    expect(box.left).toBeGreaterThan(100);
  });
});

/** A WebP's canvas size, from its header: VP8 (lossy), VP8X (lossy with alpha) or VP8L (lossless). */
function webpSize(file: string) {
  const bytes = Uint8Array.from(atob(file.split(',')[1]), (c) => c.charCodeAt(0));
  const chunk = String.fromCharCode(...bytes.slice(12, 16));
  expect(['VP8 ', 'VP8X', 'VP8L']).toContain(chunk);
  if (chunk === 'VP8 ') {
    // After the 3-byte frame tag and the start code: 14 bits of width, then 14 of height, each with 2 bits of scale.
    const uint16 = (at: number) => bytes[at] | (bytes[at + 1] << 8);
    return { width: uint16(26) & 0x3fff, height: uint16(28) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    // After the 0x2f signature: 14 bits of width - 1, then 14 of height - 1, least significant first.
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  const uint24 = (at: number) => bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
  return { width: uint24(24) + 1, height: uint24(27) + 1 };
}

describe('moteField', () => {
  const grove = BACKDROPS.find((b) => b.zone === 'about')!;
  const motes = moteField(grove.sun!.x);

  it('gives about 40 motes, the same ones for the same seed', () => {
    expect(motes).toHaveLength(MOTE_COUNT);
    expect(MOTE_COUNT).toBeGreaterThanOrEqual(35);
    expect(MOTE_COUNT).toBeLessThanOrEqual(45);
    expect(moteField(grove.sun!.x)).toEqual(motes);
    expect(moteField(grove.sun!.x, 7)).not.toEqual(motes);
  });

  it('keeps each within the view, 2 to 6 px, rising, above the foreground', () => {
    for (const mote of motes) {
      expect(mote.x).toBeGreaterThanOrEqual(0);
      expect(mote.x).toBeLessThanOrEqual(1);
      expect(mote.y).toBeLessThanOrEqual(MOTE_LOWEST);
      expect(mote.size).toBeGreaterThanOrEqual(MOTE_SIZE_PX[0]);
      expect(mote.size).toBeLessThanOrEqual(MOTE_SIZE_PX[1]);
      expect(mote.rise).toBeGreaterThan(0);
      expect(mote.opacity).toBeGreaterThanOrEqual(MOTE_OPACITY[0]);
      expect(mote.opacity).toBeLessThanOrEqual(MOTE_OPACITY[1]);
    }
  });

  it("gathers on the sun's side and is brightest there", () => {
    const sunX = grove.sun!.x;
    const near = motes.filter((m) => Math.abs(m.x - sunX) < 0.25);
    const far = motes.filter((m) => Math.abs(m.x - sunX) >= 0.25);
    expect(near.length).toBeGreaterThan(far.length);
    const mean = (list: typeof motes) => list.reduce((sum, m) => sum + m.opacity, 0) / list.length;
    expect(mean(near)).toBeGreaterThan(mean(far));
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

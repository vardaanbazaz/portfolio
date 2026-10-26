import { describe, expect, it } from 'vitest';
import { PAGE_LABELS } from '../../src/content/scene';
import {
  ambientCrossing,
  BACKDROPS,
  backdropVisibility,
  bloomAt,
  coverPoint,
  crossingAt,
  crossingHeld,
  imagePointAt,
  insidePolygon,
  layerPose,
  motionRunning,
  nightfallAt,
  objectBox,
  objectHitBox,
  objectRestBox,
  panOffset,
  posePoint,
  stageAt,
  veilAt,
  type ImagePoint,
} from '../../src/environment/backdrops';
import {
  BEACONS,
  CITY_SIZE,
  CRANE_HOOK,
  growPolygon,
  LED_FACE,
  quadPoint,
  SIGN_HIT_PAD_PX,
  signAreas,
  signName,
  SIGNS,
  type CityPoint,
} from '../../src/environment/city';
import lightsFile from '../../src/environment/assets/projects-lights.webp?inline';
import baseFile from '../../src/environment/assets/projects-base.webp?inline';
import smallFile from '../../src/environment/assets/projects-base-1024.webp?inline';
import attritionLight from '../../src/environment/assets/projects-attrition-light.webp?inline';
import attritionOutline from '../../src/environment/assets/projects-attrition-outline.webp?inline';
import dataVistaLight from '../../src/environment/assets/projects-datavista-light.webp?inline';
import dataVistaOutline from '../../src/environment/assets/projects-datavista-outline.webp?inline';
import ingesterLight from '../../src/environment/assets/projects-unified-api-ingester-light.webp?inline';
import ingesterOutline from '../../src/environment/assets/projects-unified-api-ingester-outline.webp?inline';
import kanbanLightLight from '../../src/environment/assets/projects-kanbanlight-light.webp?inline';
import kanbanLightOutline from '../../src/environment/assets/projects-kanbanlight-outline.webp?inline';
import neuroLight from '../../src/environment/assets/projects-neuroinsight-ai-light.webp?inline';
import neuroOutline from '../../src/environment/assets/projects-neuroinsight-ai-outline.webp?inline';
import { ZONE_T } from '../../src/environment/zones';
import {
  DUSK_SWAP_HALF_WIDTH,
  DUSK_VEIL_PEAK,
  NIGHTFALL,
  NIGHTFALL_HELD_UNTIL,
  PROJECTS_FACE_CYCLE_SECONDS,
  PROJECTS_PAN_T,
  RAIN_BED_GAIN,
  RAIN_BED_HIGHPASS_HZ,
  RAIN_BED_LOWPASS_HZ,
  SUNSET_GRADE,
} from '../../src/scene/tuning';
import { MARKERS } from '../../src/sections/layouts';
import { webpSize } from '../fixtures/webp';

const city = BACKDROPS.find((b) => b.zone === 'projects')!;
const grove = BACKDROPS.find((b) => b.zone === 'about')!;
const objects = city.objects!;

const MASKS: Record<string, { outline: string; light: string }> = {
  datavista: { outline: dataVistaOutline, light: dataVistaLight },
  kanbanlight: { outline: kanbanLightOutline, light: kanbanLightLight },
  attrition: { outline: attritionOutline, light: attritionLight },
  'unified-api-ingester': { outline: ingesterOutline, light: ingesterLight },
  'neuroinsight-ai': { outline: neuroOutline, light: neuroLight },
};

/** An object's rect in the painting's px. */
const rectPx = ({ rect }: (typeof objects)[number]) => ({
  x: rect.x * city.size.width,
  y: rect.y * city.size.height,
  width: rect.width * city.size.width,
  height: rect.height * city.size.height,
});

describe('the night city', () => {
  it('is the city painting, 2048 wide with a 1024-wide copy for phones, the sizes their files are', () => {
    expect(webpSize(baseFile)).toEqual(city.size);
    expect(city.size).toEqual(CITY_SIZE);
    const small = city.layers[0].small!;
    expect(small.width).toBe(1024);
    expect(webpSize(smallFile)).toEqual({ width: 1024, height: Math.round((1024 * city.size.height) / city.size.width) });
  });

  it('arrives at dusk, with rain, its details, and its rain bed', () => {
    expect(city.arrival).toBe('dusk');
    expect(city.effects).toEqual(expect.arrayContaining(['rain', 'city']));
    // A recording, bundled, as the landing's bed is.
    expect(city.ambient).toMatch(/projects-rain.*\.m4a$/);
    expect(city.ambientGain).toBe(RAIN_BED_GAIN);
    expect(city.ambientFilter).toEqual({ highpassHz: RAIN_BED_HIGHPASS_HZ, lowpassHz: RAIN_BED_LOWPASS_HZ });
    expect(grove.arrival ?? 'dawn').toBe('dawn');
  });

  it('has one painted building per project, each lit only on hover', () => {
    expect(objects.map((o) => o.marker).sort()).toEqual(Object.keys(MASKS).sort());
    for (const object of objects) {
      expect(object.kind).toBe('painted');
      expect(object.glow?.rest).toBe(false);
      expect(object.glow?.bloom).toBeUndefined();
    }
  });

  it('lies all on one plane: every building at its layer\'s depth', () => {
    for (const object of objects) expect(object.depth).toBe(city.layers[0].depth);
  });

  it("has outlines of each rect's size in the painting's px, and lights of their own box's size, which holds the rect", () => {
    for (const object of objects) {
      const px = rectPx(object);
      expect(px.x).toBeCloseTo(Math.round(px.x), 6);
      expect(px.y).toBeCloseTo(Math.round(px.y), 6);
      expect(webpSize(MASKS[object.marker].outline)).toEqual({ width: Math.round(px.width), height: Math.round(px.height) });
      const box = object.glow!.box!;
      const boxPx = { x: box.x * CITY_SIZE.width, y: box.y * CITY_SIZE.height, width: box.width * CITY_SIZE.width, height: box.height * CITY_SIZE.height };
      expect(webpSize(MASKS[object.marker].light)).toEqual({ width: Math.round(boxPx.width), height: Math.round(boxPx.height) });
      // The rect grown by 28 px each side, for the glow round the building.
      expect(boxPx.x).toBeCloseTo(px.x - 28, 6);
      expect(boxPx.y).toBeCloseTo(px.y - 28, 6);
      expect(boxPx.width).toBeGreaterThanOrEqual(px.width + 56);
      expect(boxPx.height).toBeGreaterThanOrEqual(px.height + 56);
    }
  });

  it('has its lights alone in an image of the painting, 1024 wide', () => {
    expect(city.lights).toBeDefined();
    expect(webpSize(lightsFile)).toEqual({ width: 1024, height: Math.round((1024 * city.size.height) / city.size.width) });
  });

  it('lists its buildings left to right as the markers are, so focus moves across them in order', () => {
    const byCentre = [...objects].sort((a, b) => a.rect.x + a.rect.width / 2 - (b.rect.x + b.rect.width / 2)).map((o) => o.marker);
    expect(byCentre).toEqual(MARKERS.filter((m) => m.section === 'projects').map((m) => m.key));
  });

  it("has each top on its building's top rows, within its columns", () => {
    for (const object of objects) {
      const { rect, top } = object;
      expect(top.x).toBeGreaterThan(rect.x);
      expect(top.x).toBeLessThan(rect.x + rect.width);
      expect(top.y).toBeGreaterThanOrEqual(rect.y);
      expect(top.y).toBeLessThan(rect.y + 0.2 * rect.height);
    }
  });

  it('shows the Art Deco spire at the top of a 16:9 view, and nothing past the painting on any screen', () => {
    const spire = coverPoint(city, { x: 1021 / 2048, y: 181 / 1750 }, 1920, 1080);
    expect(spire[1]).toBeGreaterThan(0);
    for (const [w, h] of [[1920, 1080], [1366, 768], [390, 844], [2560, 1080], [1024, 1366]]) {
      const [left, top] = coverPoint(city, { x: 0, y: 0 }, w, h);
      const [right, bottom] = coverPoint(city, { x: 1, y: 1 }, w, h);
      expect(left).toBeLessThanOrEqual(1e-9);
      expect(top).toBeLessThanOrEqual(1e-9);
      expect(right).toBeGreaterThanOrEqual(w - 1e-9);
      expect(bottom).toBeGreaterThanOrEqual(h - 1e-9);
    }
  });
});

describe("the projects' names on their buildings", () => {
  it('names each project exactly as its page title, once', () => {
    expect(SIGNS.map((s) => s.page).sort()).toEqual(Object.keys(MASKS).sort());
    for (const sign of SIGNS) expect(signName(sign)).toBe(PAGE_LABELS[sign.page]);
  });

  it('stacks KanbanLight on two lines and Unified API Ingester on three, and runs DataVista down its blade', () => {
    expect(SIGNS.find((s) => s.page === 'kanbanlight')!.lines).toEqual(['Kanban', 'Light']);
    expect(SIGNS.find((s) => s.page === 'unified-api-ingester')!.lines).toEqual(['Unified', 'API', 'Ingester']);
    const blade = SIGNS.find((s) => s.page === 'datavista')!;
    expect(blade.vertical).toBe(true);
    expect(blade.lines).toEqual(['DataVista']);
    expect(SIGNS.find((s) => s.page === 'attrition')!.lines).toHaveLength(1);
  });

  it("puts each sign on its own building: every corner inside that building's rect", () => {
    for (const sign of SIGNS) {
      const r = rectPx(objects.find((o) => o.marker === sign.page)!);
      for (const [x, y] of sign.quad) {
        expect(x, sign.page).toBeGreaterThanOrEqual(r.x);
        expect(x, sign.page).toBeLessThanOrEqual(r.x + r.width);
        expect(y, sign.page).toBeGreaterThanOrEqual(r.y);
        expect(y, sign.page).toBeLessThanOrEqual(r.y + r.height);
      }
    }
  });

  it("fits each sign's box onto its four corners by its perspective transform", () => {
    for (const sign of [...SIGNS, { size: { width: 200, height: 900 }, quad: LED_FACE }]) {
      const { width, height } = sign.size;
      const corners: CityPoint[] = [[0, 0], [width, 0], [width, height], [0, height]];
      corners.forEach(([x, y], i) => {
        const [px, py] = quadPoint(width, height, sign.quad, x, y);
        expect(px).toBeCloseTo(sign.quad[i][0], 2);
        expect(py).toBeCloseTo(sign.quad[i][1], 2);
      });
    }
  });

  it('hangs the code-drawn banner square under the crane hook, below it, inside the ingester building\'s outline rect', () => {
    const hanging = SIGNS.find((s) => s.style === 'hanging')!;
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = hanging.quad;
    expect(y0).toBe(y1);
    expect(y2).toBe(y3);
    expect(x0).toBe(x3);
    expect(x1).toBe(x2);
    expect(y0).toBeGreaterThan(CRANE_HOOK[1]);
    expect(Math.abs((x0 + x1) / 2 - CRANE_HOOK[0])).toBeLessThan(2);
  });

  it('sweeps a wave up the violet face once every 12 seconds, to start', () => {
    expect(PROJECTS_FACE_CYCLE_SECONDS).toBe(12);
  });

  it('has an aviation light on both cranes and two on each spire, each over a building', () => {
    expect(BEACONS).toHaveLength(6);
    for (const [x, y] of BEACONS) {
      const over = objects.some((o) => {
        const r = rectPx(o);
        return x >= r.x && x <= r.x + r.width && y >= r.y - 10 && y <= r.y + 0.12 * r.height;
      });
      expect(over, `${x},${y}`).toBe(true);
    }
  });
});

describe('the crossing from the grove into the night', () => {
  const at = (u: number) => ZONE_T.about + (ZONE_T.projects - ZONE_T.about) * u;
  const layers = (t: number) => nightfallAt(t);
  const STAGES = ['warm', 'magenta', 'veil', 'rain', 'lights'] as const;

  it('has no dawn bloom, only the nightfall', () => {
    for (let i = 0; i <= 100; i++) expect(bloomAt(at(i / 100), 1920, 1080)).toBeNull();
    expect(veilAt(at(0.5))).toBeCloseTo(DUSK_VEIL_PEAK, 12);
  });

  it('leaves the landing-to-grove crossing to the bloom, with no nightfall', () => {
    for (let i = 1; i < 100; i++) for (const stage of STAGES) expect(layers((ZONE_T.about * i) / 100)[stage]).toBe(0);
    expect(bloomAt(ZONE_T.about / 2, 1920, 1080)).not.toBeNull();
  });

  it('has the grade, the veil and the lights layer (and the rest) at 0 at both stops and where the eased camera settles near them', () => {
    for (const t of [ZONE_T.about, ZONE_T.about + 1e-9, at(1e-3), ZONE_T.projects - 1e-9, ZONE_T.projects, 0, 1]) {
      for (const stage of STAGES) expect(layers(t)[stage], `${stage} at ${t}`).toBe(0);
    }
    for (const stage of STAGES) {
      expect(stageAt(NIGHTFALL[stage], 0)).toBe(0);
      expect(stageAt(NIGHTFALL[stage], 1)).toBe(0);
    }
  });

  it('runs the stages in order, sunset, dusk, rain, city lights, the full city, each overlapping the next', () => {
    const peak = (stage: (typeof STAGES)[number]) => NIGHTFALL[stage].rise[1];
    const order = STAGES.map((stage) => NIGHTFALL[stage].rise[0]);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // The warm grade turns to magenta while it is still in; the veil rises while the magenta is still in; the lights
    // switch on while the rain is still fading in; the veil falls while the lights are still coming on.
    expect(NIGHTFALL.magenta.rise[0]).toBeLessThan(peak('warm') + (NIGHTFALL.warm.fall[1] - NIGHTFALL.warm.fall[0]));
    expect(NIGHTFALL.veil.rise[0]).toBeLessThan(NIGHTFALL.magenta.fall[1]);
    expect(NIGHTFALL.lights.rise[0]).toBeLessThan(peak('rain'));
    expect(NIGHTFALL.veil.fall[0]).toBeLessThan(peak('lights'));
    // The sunset is over by the time the veil holds; the rain begins in the dark; the lights go only once the veil has.
    expect(NIGHTFALL.magenta.fall[1]).toBeLessThanOrEqual(NIGHTFALL.veil.rise[1] + 0.02);
    expect(NIGHTFALL.rain.rise[0]).toBeLessThan(NIGHTFALL.veil.fall[0]);
    expect(NIGHTFALL.lights.fall[0]).toBeGreaterThanOrEqual(NIGHTFALL.veil.fall[1]);
    // From the start of the crossing until the city is let go, at least one of them is in at every point: one
    // picture never simply dissolves into the other.
    for (let i = 1; i < 400 * NIGHTFALL_HELD_UNTIL; i++) {
      if (!crossingAt(at(i / 400))) continue;
      const v = layers(at(i / 400));
      expect(STAGES.some((stage) => v[stage] > 0), `u ${i / 400}`).toBe(true);
    }
    expect(SUNSET_GRADE.warm.peak).toBeGreaterThan(0);
    expect(SUNSET_GRADE.magenta.peak).toBeGreaterThan(0);
  });

  it('swaps the pictures only while the veil is near its peak, so no double image shows, and always shows one or the other', () => {
    let swapped = 0;
    for (let i = 0; i <= 400; i++) {
      const t = at(i / 400);
      const shown = [backdropVisibility(t, 'about'), backdropVisibility(t, 'projects')];
      if (crossingAt(t)) expect(shown[0] + shown[1]).toBeCloseTo(1, 12);
      if (shown[0] > 0 && shown[1] > 0) {
        swapped++;
        expect(Math.abs(i / 400 - 0.5)).toBeLessThanOrEqual(DUSK_SWAP_HALF_WIDTH);
        expect(veilAt(t)).toBeGreaterThan(DUSK_VEIL_PEAK - 0.01);
        // Nothing else of the nightfall shows over the swap but the veil.
        const v = layers(t);
        for (const stage of ['warm', 'rain', 'lights'] as const) expect(v[stage], stage).toBe(0);
      }
    }
    expect(swapped).toBeGreaterThan(0);
    expect(NIGHTFALL.veil.rise[1]).toBeLessThanOrEqual(0.5 - DUSK_SWAP_HALF_WIDTH);
    expect(NIGHTFALL.veil.fall[0]).toBeGreaterThanOrEqual(0.5 + DUSK_SWAP_HALF_WIDTH);
  });

  it('holds both worlds still until the lights have gone into the full city, then lets the city go; the dawn crossing holds throughout', () => {
    expect(crossingHeld(crossingAt(at(0.5)))).toBe(true);
    expect(crossingHeld(crossingAt(at(NIGHTFALL_HELD_UNTIL - 0.01)))).toBe(true);
    expect(crossingHeld(crossingAt(at(NIGHTFALL_HELD_UNTIL + 0.01)))).toBe(false);
    expect(NIGHTFALL_HELD_UNTIL).toBeGreaterThanOrEqual(NIGHTFALL.lights.fall[1]);
    expect(crossingHeld(crossingAt(ZONE_T.about * 0.9))).toBe(true);
    expect(crossingHeld(null)).toBe(false);
  });

  it('fades the rain bed in with the rain, and leaves it to the weight elsewhere', () => {
    expect(ambientCrossing(at(NIGHTFALL.rain.rise[0] - 0.01), 'projects')).toBe(0);
    expect(ambientCrossing(at(0.7), 'projects')).toBeGreaterThan(0);
    expect(ambientCrossing(at(0.95), 'projects')).toBe(1);
    expect(ambientCrossing(ZONE_T.projects, 'projects')).toBe(1);
    expect(ambientCrossing(at(0.3), 'about')).toBe(1);
  });

  it('changes no more than three full-view layers at once anywhere in it, on a phone too', () => {
    for (const [w, h] of [[1920, 1080], [390, 844]]) {
      let last: number[] | null = null;
      for (let i = 0; i <= 800; i++) {
        const t = at(i / 800);
        const crossing = crossingAt(t);
        if (!crossing) continue;
        const v = layers(t);
        // The two pictures, the grade's two layers, the veil, the rain's canvas (fading, and drawn anew whenever it
        // shows: it changes every frame then, as its own entry), the lights, and the city's picture and plane, which
        // move with the pan, and with the parallax once the crossing no longer holds them. The canvas draws only near
        // drops in a crossing (tested in backdropPlayer.test.ts); the grove holds still throughout.
        const pan = panOffset(city, t, w, h);
        const moving = motionRunning(1, false, false, false, crossingHeld(crossing)) ? i : 0;
        const now = [
          backdropVisibility(t, 'about'),
          backdropVisibility(t, 'projects'),
          v.warm,
          v.magenta,
          v.veil,
          v.rain,
          v.rain > 0 ? i : 0,
          v.lights,
          pan + moving,
          pan + moving,
        ];
        if (last) {
          // The rain's fade and its fall are one layer.
          const changed = now.filter((value, k) => k !== 6 && Math.abs(value - last![k]) > 1e-12).length;
          const rainFalls = now[6] !== last[6] && Math.abs(now[5] - last[5]) <= 1e-12 ? 1 : 0;
          expect(changed + rainFalls, `${w}x${h} u ${i / 800}`).toBeLessThanOrEqual(3);
        }
        last = now;
      }
    }
  });
});

describe("each project's hit areas: its outline, its sign surfaces and its marker", () => {
  const view = { width: 1920, height: 1080 };
  const pose = layerPose(city.layers[0].depth, 1, 0, 0, city.horizon, view.width, view.height);
  const toView = (p: ImagePoint) => posePoint(coverPoint(city, p, view.width, view.height), pose, city.horizon, view.width, view.height);
  const frac = ([x, y]: CityPoint): ImagePoint => ({ x: x / CITY_SIZE.width, y: y / CITY_SIZE.height });
  const centre = (points: readonly CityPoint[]): CityPoint => [
    points.reduce((s, [x]) => s + x, 0) / points.length,
    points.reduce((s, [, y]) => s + y, 0) / points.length,
  ];

  it('maps a point of the view back to the painting exactly as the painting is drawn', () => {
    for (const p of [{ x: 0.1, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0.83, y: 0.71 }]) {
      const [x, y] = toView(p);
      const back = imagePointAt(city, pose, x, y, view.width, view.height);
      expect(back.x).toBeCloseTo(p.x, 9);
      expect(back.y).toBeCloseTo(p.y, 9);
    }
  });

  it('gives every project its sign, grown past its corners, and the hanging banner its cables up to the hook', () => {
    for (const sign of SIGNS) {
      const areas = signAreas(sign.page);
      expect(areas.length).toBeGreaterThan(0);
      for (const corner of sign.quad) {
        expect(areas.some((area) => insidePolygon(area.map(frac), frac(corner))), `${sign.page} ${corner}`).toBe(true);
      }
      const object = objects.find((o) => o.marker === sign.page)!;
      expect(object.areas?.length).toBe(areas.length);
    }
    const hanging = signAreas('unified-api-ingester')[0].map(frac);
    expect(insidePolygon(hanging, frac([CRANE_HOOK[0], CRANE_HOOK[1] + 2]))).toBe(true);
    // The violet face, all of it.
    const led = signAreas('neuroinsight-ai').map((area) => area.map(frac));
    expect(led.some((area) => insidePolygon(area, frac(centre(LED_FACE))))).toBe(true);
    // A square grown by the pad is the square, larger by the pad each side.
    expect(growPolygon([[0, 0], [10, 0], [10, 10], [0, 10]], SIGN_HIT_PAD_PX)).toEqual([
      [-SIGN_HIT_PAD_PX, -SIGN_HIT_PAD_PX],
      [10 + SIGN_HIT_PAD_PX, -SIGN_HIT_PAD_PX],
      [10 + SIGN_HIT_PAD_PX, 10 + SIGN_HIT_PAD_PX],
      [-SIGN_HIT_PAD_PX, 10 + SIGN_HIT_PAD_PX],
    ]);
  });

  it("takes presses over each sign, its cables included, inside the box the press area covers", () => {
    for (const object of objects) {
      const hit = objectHitBox(city, object, pose, view.width, view.height);
      const body = objectBox(city, object, pose, view.width, view.height);
      expect(hit.left).toBeLessThanOrEqual(body.left);
      expect(hit.left + hit.width).toBeGreaterThanOrEqual(body.left + body.width);
      for (const area of object.areas ?? []) {
        for (const p of area) {
          const [x, y] = toView(p);
          expect(x).toBeGreaterThanOrEqual(hit.left - 1e-6);
          expect(x).toBeLessThanOrEqual(hit.left + hit.width + 1e-6);
          expect(y).toBeGreaterThanOrEqual(hit.top - 1e-6);
          expect(y).toBeLessThanOrEqual(hit.top + hit.height + 1e-6);
        }
      }
    }
  });

  it("puts no sign surface of one project over another's sign", () => {
    for (const a of SIGNS) {
      for (const b of SIGNS) {
        if (a.page === b.page) continue;
        const [x, y] = centre(b.quad);
        expect(signAreas(a.page).some((area) => insidePolygon(area.map(frac), frac([x, y]))), `${a.page} over ${b.page}`).toBe(false);
      }
    }
  });
});

describe('the city pans on narrow screens', () => {
  const stops = PROJECTS_PAN_T;
  const tOf = (i: number) => stops[0] + ((stops[1] - stops[0]) * i) / (objects.length - 1);
  const ordered = [...objects].sort((a, b) => a.rect.x - b.rect.x);

  it('never pans where the painting fits the view across', () => {
    for (const [w, h] of [[1920, 1080], [1366, 768], [1280, 720], [2560, 1080]]) {
      for (let i = 0; i <= 20; i++) expect(panOffset(city, i / 20, w, h)).toBe(0);
    }
  });

  it('brings each building to the middle of a 390x844 view in turn, or wholly into it where the painting ends', () => {
    const [w, h] = [390, 844];
    ordered.forEach((object, i) => {
      const box = objectRestBox(city, object, w, h);
      const pan = panOffset(city, tOf(i), w, h);
      const middle = box.left + pan + box.width / 2;
      const inMiddle = Math.abs(middle - w / 2) < 1;
      const whole = box.left + pan >= -1 && box.left + pan + box.width <= w + 1;
      expect(inMiddle || whole, object.marker).toBe(true);
      // And always at least its middle in view.
      expect(middle).toBeGreaterThan(0);
      expect(middle).toBeLessThan(w);
    });
  });

  it('never shows past the painting, and moves smoothly with the path', () => {
    for (const [w, h] of [[390, 844], [360, 780], [768, 1024]]) {
      const [left] = coverPoint(city, { x: 0, y: 0 }, w, h);
      const [right] = coverPoint(city, { x: 1, y: 1 }, w, h);
      let previous = panOffset(city, 0, w, h);
      for (let i = 0; i <= 1000; i++) {
        const pan = panOffset(city, i / 1000, w, h);
        expect(left + pan).toBeLessThanOrEqual(1e-9);
        expect(right + pan).toBeGreaterThanOrEqual(w - 1e-9);
        expect(Math.abs(pan - previous)).toBeLessThan(0.05 * w);
        previous = pan;
      }
    }
  });

  it('holds still across the crossing until it lets the city go, then pans, the middle building at the stop', () => {
    const released = ZONE_T.about + (ZONE_T.projects - ZONE_T.about) * NIGHTFALL_HELD_UNTIL;
    expect(stops[0]).toBeGreaterThanOrEqual(released);
    expect(panOffset(city, ZONE_T.about, 390, 844)).toBe(panOffset(city, released, 390, 844));
    expect((stops[0] + stops[1]) / 2).toBeCloseTo(ZONE_T.projects, 9);
  });
});

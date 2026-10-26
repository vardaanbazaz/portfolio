import {
  AMBIENT_GAIN,
  BLOOM_PEAK,
  BLOOM_RADIUS,
  CROSSING_SWAP_HALF_WIDTH,
  DUSK_SWAP_HALF_WIDTH,
  DUSK_VEIL_PEAK,
  EFFECTS_MIN_WEIGHT,
  LAYER_PUSH_PX,
  LAYER_PUSH_SCALE,
  LAYER_REST_SCALE,
  MOTE_COUNT,
  MOTE_DRIFT_PX,
  MOTE_LOWEST,
  MOTE_OPACITY,
  MOTE_PERIOD_SECONDS,
  MOTE_RISE_PX,
  MOTE_SEED,
  MOTE_SIZE_PX,
  MOTE_SUN_BIAS,
  NIGHTFALL,
  NIGHTFALL_HELD_UNTIL,
  NIGHTFALL_RAIN_SOUND,
  PARALLAX_MAX_X_PX,
  PARALLAX_MAX_Y_PX,
  PROJECTS_PAN_T,
  RAIN_BED_GAIN,
  RAIN_BED_HIGHPASS_HZ,
  RAIN_BED_LOWPASS_HZ,
  STAR_COLOR,
  STAR_GLOW_CLEAR_HALF_WIDTH,
  STAR_GLOW_FADE_WIDTH,
  STAR_PERIOD_SECONDS,
  STAR_SEED,
  STAR_SKY_FRACTION,
  STAR_TIERS,
  STAR_TINT_SHARE,
  STAR_TINTS,
  STAR_TOP_BIAS,
  SUNSET_GRADE,
  type NightfallStage,
  type StarTier,
} from '../scene/tuning';
import type { MarkerKey, SectionId } from '../sections/contract';
import { MARKERS } from '../sections/layouts';
import { seeded } from '../visuals/seeded';
import aboutBase from './assets/about-base.webp';
import aboutStoneGlow from './assets/about-stone-glow.webp';
import aboutStoneOutline from './assets/about-stone-outline.webp';
import landingAmbient from './assets/landing-ambient.m4a';
import landingBase from './assets/landing-base.webp';
import landingGround from './assets/landing-ground.webp';
import projectsAttritionLight from './assets/projects-attrition-light.webp';
import projectsAttritionOutline from './assets/projects-attrition-outline.webp';
import projectsBase from './assets/projects-base.webp';
import projectsBaseSmall from './assets/projects-base-1024.webp';
import projectsDataVistaLight from './assets/projects-datavista-light.webp';
import projectsDataVistaOutline from './assets/projects-datavista-outline.webp';
import projectsIngesterLight from './assets/projects-unified-api-ingester-light.webp';
import projectsIngesterOutline from './assets/projects-unified-api-ingester-outline.webp';
import projectsKanbanLightLight from './assets/projects-kanbanlight-light.webp';
import projectsKanbanLightOutline from './assets/projects-kanbanlight-outline.webp';
import projectsLights from './assets/projects-lights.webp';
import projectsNeuroInsightLight from './assets/projects-neuroinsight-ai-light.webp';
import projectsNeuroInsightOutline from './assets/projects-neuroinsight-ai-outline.webp';
import projectsRain from './assets/projects-rain.m4a';
import { CITY_SIZE, signAreas, type CityPoint } from './city';
import type { AmbientFilter } from '../sound/sound';
import { ZONES, zoneWeight, type ZoneId, type ZoneTable } from './zones';

/** One still image of a zone's backdrop. All of a zone's images share one size, so they line up when drawn the same
 *  way. `depth` is how near it is: 0 never moves, 1 moves the full amounts in `tuning.ts`. */
export interface BackdropImage {
  src: string;
  depth: number;
  /** A copy half as wide, for narrow screens, and its width in px. */
  small?: { src: string; width: number };
}

/** Drawn by code over a zone's images: a mist band drifting along the horizon, faint stars fading in the sky, warm
 *  motes of light drifting up, a slow shimmer of the light falling from the upper left, slanting rain, and the night
 *  city's own details (its buildings' names, aviation lights, far windows and car lights: `city.ts`). */
export type BackdropEffect = 'mist' | 'stars' | 'motes' | 'shimmer' | 'rain' | 'city';

/** A point of a backdrop's images, as fractions of their width (0 left, 1 right) and height (0 top, 1 bottom). */
export interface ImagePoint {
  x: number;
  y: number;
}

/** A rect of a backdrop's images: its left and top edges and its size, as fractions of their width and height. */
export interface ImageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A soft round light: its centre and its radii across and down, as fractions of the rect it lies in. */
export interface Bloom {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

/**
 * Something standing in a zone's world that the visitor can press, painted into its backdrop's image: it has no image
 * of its own, and is defined by masks traced from that image when the assets are built. It moves with its layer's
 * pose, as everything painted in that layer does.
 */
export interface BackdropObject {
  kind: 'painted';
  /** Where its masks lie in the images. */
  rect: ImageRect;
  /** Which pixels of `rect` are the object (solid alpha) and which aren't: an image of `rect`'s size in px. Only a
   *  press on a solid pixel counts. */
  outline: string;
  /** The top of the object, where its marker is pinned above it. */
  top: ImagePoint;
  /** As an image layer's: the depth of the layer it is painted in. */
  depth: number;
  /** The section marker it stands for: the marker button is pinned above it, and a press on it opens what the
   *  marker opens. */
  marker: MarkerKey;
  /** Surfaces drawn or painted on it that take presses as its outline does, though they may reach past it: its sign or
   *  name (a blade, a banner and its cables, lettering, a lit face). Polygons, in fractions of the images. Where any
   *  object's surface is under a press, it takes it before any outline does. */
  areas?: readonly (readonly ImagePoint[])[];
  /** Its light: an image of `rect`'s size (or of `box`, where given), opaque only on the pixels that glow. Added over
   *  it, breathing, with a soft round bloom; unless `rest` is false, when it shows only on hover and focus (a
   *  building's light: the building brightened, drawn with normal blending, with a glow round it, so its image reaches
   *  past its rect). */
  glow?: { src: string; bloom?: Bloom; rest?: boolean; box?: ImageRect };
}

/** A zone's world behind the transparent canvas: still image layers moved by code, effects over them, and an
 *  optional ambient sound bed. All bundled; nothing is fetched from anywhere else. */
export interface ZoneBackdrop {
  zone: ZoneId;
  /** The images' size in px. */
  size: { width: number; height: number };
  /** Back to front. Stars go just over the first; mist over the last. */
  layers: readonly BackdropImage[];
  /** Painted in its layers; drawn over the mist only by their light. */
  objects?: readonly BackdropObject[];
  /** Where the light comes from (the sun, or a dawn glow on the horizon): motes gather on its side, and the bloom of a
   *  crossing starts and ends on it. */
  sun?: ImagePoint;
  /** The mist band's colour, when it isn't the mist image's own pale blue-white. */
  mistTint?: string;
  /** Where the mist band thins out, as fractions of the view's width from the left: whole up to the first, gone by
   *  the second. For a horizon that runs behind something near, which mist mustn't cross. Whole across by default. */
  mistFade?: readonly [whole: number, gone: number];
  /** The horizon row, as a fraction of the images' height from the top. Kept at that height of the view on every
   *  screen, and where the mist sits. */
  horizon: number;
  /** Horizontal focus of the cover crop (0 left, 1 right) on landscape screens, and on screens taller than wide. */
  focusX: number;
  portraitFocusX: number;
  effects: readonly BackdropEffect[];
  ambient?: string;
  /** The ambient bed's gain at full weight, when it isn't `AMBIENT_GAIN`. */
  ambientGain?: number;
  /** Filters the ambient bed plays through, in Hz, where it has any. */
  ambientFilter?: AmbientFilter;
  /** How the crossing from the world before it arrives here: at dawn (the bloom, by default), or at dusk (the veil). */
  arrival?: 'dawn' | 'dusk';
  /** Where its picture is wider than the view: the stretch of the path (t) over which it pans sideways to bring each
   *  of its objects to the middle of the view in turn, left to right. */
  pan?: readonly [from: number, to: number];
  /** For a world arriving at dusk: an image of its lights alone (its bright pixels, the rest clear), the same picture
   *  as its layers, which switches on in the dark of the crossing before the rest of it comes in. */
  lights?: string;
}

/** A building's rect and its light's box, in px of the city's 2048 by 1750 painting, as fractions. */
const cityRect = (x: number, y: number, width: number, height: number): ImageRect => ({
  x: x / CITY_SIZE.width,
  y: y / CITY_SIZE.height,
  width: width / CITY_SIZE.width,
  height: height / CITY_SIZE.height,
});
const cityPoint = ([x, y]: CityPoint): ImagePoint => ({ x: x / CITY_SIZE.width, y: y / CITY_SIZE.height });

/** A project's sign surfaces on the city painting, as fractions of it. */
const cityAreas = (page: Parameters<typeof signAreas>[0]) => signAreas(page).map((polygon) => polygon.map(cityPoint));

/** At most one per zone. A new world is one more entry here; nothing else changes. */
export const BACKDROPS: readonly ZoneBackdrop[] = [
  {
    zone: 'landing',
    size: { width: 2048, height: 1152 },
    layers: [
      { src: landingBase, depth: 0.3 },
      { src: landingGround, depth: 1 },
    ],
    // Row 725 of 1152: the first row of dark land, under the pale strip.
    horizon: 0.629,
    // The glow's centre (column 1031 of 2048), so it stays in frame on the narrowest phones.
    focusX: 0.503,
    portraitFocusX: 0.503,
    // The dawn glow, where it meets the horizon.
    sun: { x: 0.503, y: 0.629 },
    effects: ['mist', 'stars'],
    ambient: landingAmbient,
  },
  {
    zone: 'about',
    size: { width: 2048, height: 1151 },
    layers: [{ src: aboutBase, depth: 0.5 }],
    objects: [
      {
        kind: 'painted',
        // The carved standing stone left of centre, on its low plinth: columns 578 to 805, rows 610 to 1019.
        rect: { x: 578 / 2048, y: 610 / 1151, width: 228 / 2048, height: 410 / 1151 },
        outline: aboutStoneOutline,
        // Its top, column 698 (the middle of the stone's own columns, not the wider plinth's), row 610.
        top: { x: 698 / 2048, y: 610 / 1151 },
        depth: 0.5,
        marker: 'about',
        // The gold spiral on its face: columns 671 to 759, rows 676 to 907.
        glow: { src: aboutStoneGlow, bloom: { x: 0.601, y: 0.443, rx: 0.31, ry: 0.37 } },
      },
    ],
    // Row 900: the far edge of the meadow, under the hazy hills and the ruins, level across the clearing.
    horizon: 0.782,
    focusX: 0.5,
    // Columns 383 to 915 show at 390x844: the sun on the left, the stone in the middle, clear of the caption's text
    // below it on the left; the trunk is cropped.
    portraitFocusX: 0.28,
    // The sun's disc, centred at column 540, row 693.
    sun: { x: 0.264, y: 0.602 },
    effects: ['mist', 'shimmer', 'motes'],
    mistTint: '#f3dcb0',
    // The open meadow is on the left; the stone stands in front of the horizon from column 622 (0.3 of the width), and
    // the hanging roots and the trunk right of it.
    mistFade: [0.2, 0.28],
  },
  {
    zone: 'projects',
    size: { width: 2048, height: 1750 },
    layers: [{ src: projectsBase, depth: 0.5, small: { src: projectsBaseSmall, width: 1024 } }],
    // Each building, traced by hand from the painting (its body and its crane), down to the railing. Listed back to
    // front where they overlap: the second crane's jib reaches in front of the violet tower. Rects and tops in px of
    // the 2048 by 1750 image.
    objects: [
      {
        kind: 'painted',
        // The dark glass tower with the cyan light line and blade sign: columns 95 to 399, rows 130 to 1282.
        rect: cityRect(95, 130, 305, 1153),
        outline: projectsDataVistaOutline,
        // The top of its light line.
        top: { x: 290 / 2048, y: 133 / 1750 },
        depth: 0.5,
        marker: 'datavista',
        areas: cityAreas('datavista'),
        // Each building's light reaches 28 px past its rect, for the glow round it (to an even size).
        glow: { src: projectsDataVistaLight, rest: false, box: cityRect(67, 102, 362, 1210) },
      },
      {
        kind: 'painted',
        // The construction tower with its crane and the pale banner: columns 415 to 777, rows 497 to 1389.
        rect: cityRect(415, 497, 363, 893),
        outline: projectsKanbanLightOutline,
        // The top of its crane's mast.
        top: { x: 531 / 2048, y: 500 / 1750 },
        depth: 0.5,
        marker: 'kanbanlight',
        areas: cityAreas('kanbanlight'),
        glow: { src: projectsKanbanLightLight, rest: false, box: cityRect(387, 469, 420, 950) },
      },
      {
        kind: 'painted',
        // The amber Art Deco tower, spire to base: columns 868 to 1171, rows 178 to 1459.
        rect: cityRect(868, 178, 304, 1282),
        outline: projectsAttritionOutline,
        // The spire's tip.
        top: { x: 1021 / 2048, y: 181 / 1750 },
        depth: 0.5,
        marker: 'attrition',
        areas: cityAreas('attrition'),
        glow: { src: projectsAttritionLight, rest: false, box: cityRect(840, 150, 360, 1338) },
      },
      {
        kind: 'painted',
        // The violet tower and its mast: columns 1545 to 1815, rows 95 to 1257.
        rect: cityRect(1545, 95, 271, 1163),
        outline: projectsNeuroInsightOutline,
        // The top of its face, beside the mast.
        top: { x: 1680 / 2048, y: 258 / 1750 },
        depth: 0.5,
        marker: 'neuroinsight-ai',
        areas: cityAreas('neuroinsight-ai'),
        glow: { src: projectsNeuroInsightLight, rest: false, box: cityRect(1517, 67, 328, 1220) },
      },
      {
        kind: 'painted',
        // The steel-skeleton block, its crane, and the banner hung from the hook: columns 1200 to 1599, rows 545 to
        // 1459.
        rect: cityRect(1200, 545, 400, 915),
        outline: projectsIngesterOutline,
        // The top of its crane's mast.
        top: { x: 1358 / 2048, y: 545 / 1750 },
        depth: 0.5,
        marker: 'unified-api-ingester',
        areas: cityAreas('unified-api-ingester'),
        glow: { src: projectsIngesterLight, rest: false, box: cityRect(1172, 517, 456, 972) },
      },
    ],
    // Not the eye line (the far skyline's haze, near row 870), which would crop the spires on wide screens: row 315,
    // kept at that height of the view, which at 16:9 shows rows 108 to 1259, from just above the Art Deco spire's tip
    // down to the railing on the left.
    horizon: 0.18,
    focusX: 0.5,
    // The Art Deco tower in the middle; the pan moves from there.
    portraitFocusX: 0.5,
    effects: ['rain', 'city'],
    ambient: projectsRain,
    ambientGain: RAIN_BED_GAIN,
    ambientFilter: { highpassHz: RAIN_BED_HIGHPASS_HZ, lowpassHz: RAIN_BED_LOWPASS_HZ },
    arrival: 'dusk',
    pan: PROJECTS_PAN_T,
    lights: projectsLights,
  },
];

/** The backdrop whose images the loading screen waits for: the landing's. Every other world's load after it. */
export const FIRST_BACKDROP = BACKDROPS[0];

/** How far each backdrop's images have come in, by zone: 0 until they have decoded, then rising to 1 as the world
 *  fades in. The player sets it as it loads them; a zone it hasn't set counts as fully in. */
const readiness = new Map<ZoneId, number>();

/** A backdrop's readiness, as the player last set it. */
export type Readiness = (zone: ZoneId) => number;
export const backdropReadiness: Readiness = (zone) => readiness.get(zone) ?? 1;

export function setBackdropReadiness(zone: ZoneId, value: number) {
  readiness.set(zone, Math.min(Math.max(value, 0), 1));
}

/** Below this a backdrop's weight counts as 0. The camera eases toward the scroll position and never quite arrives,
 *  so without it the landing's weight at About would stay a hair above 0 and its motion would never stop. */
export const BACKDROP_MIN_WEIGHT = 1e-3;

/** A backdrop's weight at path position t: its zone's weight times its readiness, snapped to 0 below
 *  `BACKDROP_MIN_WEIGHT`. A world whose images haven't come in has none, so the path shows as it did before it had a
 *  backdrop. */
export function backdropWeight(t: number, zone: ZoneId, zones: ZoneTable = ZONES, ready: Readiness = backdropReadiness): number {
  const weight = zoneWeight(t, zone, zones) * ready(zone);
  return weight < BACKDROP_MIN_WEIGHT ? 0 : weight;
}

/** Whether a backdrop's effects (stars, mist, light) are drawn at all: only from `EFFECTS_MIN_WEIGHT` up. */
export const effectsShown = (weight: number) => weight >= EFFECTS_MIN_WEIGHT;

/** How much of the drawn sky dome and grid shows at path position t: whatever the backdrops' zones leave. 0 where a
 *  backdrop's zone applies fully (nothing drawn there), 1 where no backdrop's zone has any weight. */
export function worldOpacity(
  t: number,
  backdrops: readonly ZoneBackdrop[] = BACKDROPS,
  zones: ZoneTable = ZONES,
  ready: Readiness = backdropReadiness,
): number {
  let covered = 0;
  for (const { zone } of backdrops) covered += backdropWeight(t, zone, zones, ready);
  // Between two backdrops their weights sum to 1 only to rounding, which would leave the dome drawn at a hair above 0.
  const opacity = Math.min(Math.max(1 - covered, 0), 1);
  return opacity < BACKDROP_MIN_WEIGHT ? 0 : opacity;
}

const MARKER_SECTION = new Map(MARKERS.map(({ key, section }) => [key, section]));

/** Whether a backdrop stands in for a section's own visuals: it has an object for one of the section's markers. */
const standsInFor = (backdrop: ZoneBackdrop, section: SectionId) =>
  backdrop.objects?.some((object) => MARKER_SECTION.get(object.marker) === section) ?? false;

/** How much of a section's visuals shows at path position t: whatever the backdrops leave, so nothing grey is drawn
 *  over a backdrop. A backdrop in the section's own zone hides it only when one of its objects stands in for it (as
 *  the grove's stone does for About, and the city's buildings for Projects), and then wherever it has any weight at
 *  all; otherwise the section shows over its own world. 0 at the landing and all the way to About, 1 wherever no
 *  backdrop that hides it has any weight. */
export function sectionOpacity(
  t: number,
  section: SectionId,
  backdrops: readonly ZoneBackdrop[] = BACKDROPS,
  zones: ZoneTable = ZONES,
  ready: Readiness = backdropReadiness,
): number {
  let covered = 0;
  for (const backdrop of backdrops) {
    const weight = backdropWeight(t, backdrop.zone, zones, ready);
    if (backdrop.zone !== section) covered += weight;
    else if (standsInFor(backdrop, section) && weight > 0) covered = 1;
  }
  const opacity = Math.min(Math.max(1 - covered, 0), 1);
  return opacity < BACKDROP_MIN_WEIGHT ? 0 : opacity;
}

/** Between two neighbouring zones that both have a backdrop: which they are, and how far t lies from the first to
 *  the second (0 to 1). Null anywhere else. */
export function thresholdAt(
  t: number,
  backdrops: readonly ZoneBackdrop[] = BACKDROPS,
  zones: ZoneTable = ZONES,
): { from: ZoneId; to: ZoneId; u: number } | null {
  const has = (zone: ZoneId) => backdrops.some((b) => b.zone === zone);
  for (let i = 0; i < zones.length - 1; i++) {
    const a = zones[i];
    const b = zones[i + 1];
    if (t > a.t && t < b.t) return has(a.id) && has(b.id) ? { from: a.id, to: b.id, u: (t - a.t) / (b.t - a.t) } : null;
  }
  return null;
}

/** A crossing: across a threshold (`thresholdAt`) while both backdrops have weight. It begins once the second has any
 *  and ends once the first has none, so it ends although the eased camera never quite reaches the stop. `ready` is
 *  how far both worlds' images have come in (the lesser readiness). */
export function crossingAt(
  t: number,
  backdrops: readonly ZoneBackdrop[] = BACKDROPS,
  zones: ZoneTable = ZONES,
  ready: Readiness = backdropReadiness,
): { from: ZoneId; to: ZoneId; u: number; ready: number } | null {
  const threshold = thresholdAt(t, backdrops, zones);
  if (!threshold) return null;
  const { from, to } = threshold;
  if (backdropWeight(t, from, zones, ready) === 0 || backdropWeight(t, to, zones, ready) === 0) return null;
  return { ...threshold, ready: Math.min(ready(from), ready(to)) };
}

const smoothstep = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** How a crossing into a zone arrives: at dawn unless its backdrop says dusk. */
const arrivalOf = (zone: ZoneId, backdrops: readonly ZoneBackdrop[]) => backdrops.find((b) => b.zone === zone)?.arrival ?? 'dawn';

/** How far in a stage of the nightfall is at a share u of the crossing (0 to 1): rising over its `rise`, falling over
 *  its `fall`, eased; 0 before it rises and after it has fallen, and at both ends of the crossing. */
export function stageAt(stage: NightfallStage, u: number): number {
  if (u <= 0 || u >= 1) return 0;
  const [r0, r1] = stage.rise;
  if (u <= r0) return 0;
  const rise = u >= r1 ? 1 : smoothstep((u - r0) / (r1 - r0));
  if (!stage.fall) return rise;
  const [f0, f1] = stage.fall;
  if (u >= f1) return 0;
  return u <= f0 ? rise : rise * smoothstep(1 - (u - f0) / (f1 - f0));
}

/** Every layer of the nightfall at path position t, as the opacity it is drawn at: the sunset grade's warm and
 *  magenta layers, the veil, the city's near rain and its lights; and how far the rain bed has faded in (`sound`).
 *  All 0 outside a crossing into a world that arrives at dusk, so at both stops. Each scales with how far both
 *  worlds' images have come in. */
export interface Nightfall {
  warm: number;
  magenta: number;
  veil: number;
  rain: number;
  lights: number;
  sound: number;
}

export const NO_NIGHTFALL: Nightfall = { warm: 0, magenta: 0, veil: 0, rain: 0, lights: 0, sound: 0 };

export function nightfallAt(
  t: number,
  backdrops: readonly ZoneBackdrop[] = BACKDROPS,
  zones: ZoneTable = ZONES,
  ready: Readiness = backdropReadiness,
): Nightfall {
  const crossing = crossingAt(t, backdrops, zones, ready);
  if (!crossing || arrivalOf(crossing.to, backdrops) !== 'dusk') return NO_NIGHTFALL;
  const { u, ready: k } = crossing;
  const [s0, s1] = NIGHTFALL_RAIN_SOUND;
  return {
    warm: SUNSET_GRADE.warm.peak * stageAt(NIGHTFALL.warm, u) * k,
    magenta: SUNSET_GRADE.magenta.peak * stageAt(NIGHTFALL.magenta, u) * k,
    veil: DUSK_VEIL_PEAK * stageAt(NIGHTFALL.veil, u) * k,
    rain: stageAt(NIGHTFALL.rain, u) * k,
    lights: stageAt(NIGHTFALL.lights, u) * k,
    sound: smoothstep(clamp01((u - s0) / (s1 - s0))),
  };
}

/** The dusk veil's opacity at path position t: 0 outside a crossing into a world that arrives at dusk, and so at
 *  both stops; its peak while the pictures swap. */
export const veilAt = (t: number, backdrops: readonly ZoneBackdrop[] = BACKDROPS, zones: ZoneTable = ZONES, ready: Readiness = backdropReadiness) =>
  nightfallAt(t, backdrops, zones, ready).veil;

/** Whether both worlds of a crossing hold still: across the whole of a dawn crossing, and across a dusk crossing
 *  until its lights have gone into the full city (`NIGHTFALL_HELD_UNTIL`), after which the second world's life
 *  starts. */
export function crossingHeld(
  crossing: { to: ZoneId; u: number } | null,
  backdrops: readonly ZoneBackdrop[] = BACKDROPS,
): boolean {
  if (!crossing) return false;
  return arrivalOf(crossing.to, backdrops) !== 'dusk' || crossing.u < NIGHTFALL_HELD_UNTIL;
}

/** How a world's ambient bed follows a crossing into it at dusk: its rain bed only fades in from the rain's first
 *  streaks (`Nightfall.sound`). 1 anywhere else. */
export function ambientCrossing(
  t: number,
  zone: ZoneId,
  backdrops: readonly ZoneBackdrop[] = BACKDROPS,
  zones: ZoneTable = ZONES,
  ready: Readiness = backdropReadiness,
): number {
  const crossing = crossingAt(t, backdrops, zones, ready);
  if (!crossing || crossing.to !== zone || arrivalOf(zone, backdrops) !== 'dusk') return 1;
  return nightfallAt(t, backdrops, zones, ready).sound;
}

/**
 * How much of a backdrop's picture shows at path position t. Its weight, except during a crossing (`crossingAt`):
 * there the pictures crossfade over `CROSSING_SWAP_HALF_WIDTH` each side of the midpoint, under the bloom (or over
 * `DUSK_SWAP_HALF_WIDTH`, under the veil at its peak, into a world arriving at dusk), and the two
 * always sum to 1, so nothing of the dome shows between them. While a world is still fading in, it eases from the one
 * to the other.
 */
export function backdropVisibility(
  t: number,
  zone: ZoneId,
  backdrops: readonly ZoneBackdrop[] = BACKDROPS,
  zones: ZoneTable = ZONES,
  ready: Readiness = backdropReadiness,
): number {
  const weight = backdropWeight(t, zone, zones, ready);
  const crossing = crossingAt(t, backdrops, zones, ready);
  if (!crossing || (zone !== crossing.from && zone !== crossing.to)) return weight;
  const half = arrivalOf(crossing.to, backdrops) === 'dusk' ? DUSK_SWAP_HALF_WIDTH : CROSSING_SWAP_HALF_WIDTH;
  const into = smoothstep(clamp01((crossing.u - (0.5 - half)) / (2 * half)));
  return lerp(weight, zone === crossing.to ? into : 1 - into, crossing.ready);
}

/** The bloom of a crossing in a `width` by `height` view: its opacity at its centre, where its centre is, and its
 *  radius, all in px. */
export interface BloomState {
  opacity: number;
  x: number;
  y: number;
  radius: number;
}

/** How far into its rise the bloom is at a share u of a crossing: 0 at both ends, 1 at the midpoint. */
export const bloomRise = (u: number) => smoothstep(clamp01(1 - Math.abs(2 * u - 1)));

/**
 * The bloom at path position t in a `width` by `height` view, or null outside a crossing (opacity exactly 0 at both
 * stops) and in a crossing into a world that arrives at dusk. A radial light that grows from the first world's light (the landing's dawn glow) and travels to the
 * second's (the grove's sun): its opacity rises to `peak` at the midpoint and its radius to `BLOOM_RADIUS.mid` of the
 * view's width, from `BLOOM_RADIUS.end` at either end. Each world's light is placed by that world's own cover crop.
 */
export function bloomAt(
  t: number,
  width: number,
  height: number,
  backdrops: readonly ZoneBackdrop[] = BACKDROPS,
  zones: ZoneTable = ZONES,
  ready: Readiness = backdropReadiness,
  peak: number = BLOOM_PEAK,
): BloomState | null {
  const crossing = crossingAt(t, backdrops, zones, ready);
  if (!crossing || arrivalOf(crossing.to, backdrops) === 'dusk') return null;
  const light = (zone: ZoneId) => {
    const backdrop = backdrops.find((b) => b.zone === zone)!;
    return coverPoint(backdrop, backdrop.sun ?? { x: backdrop.focusX, y: backdrop.horizon }, width, height);
  };
  const [x0, y0] = light(crossing.from);
  const [x1, y1] = light(crossing.to);
  const rise = bloomRise(crossing.u);
  const along = smoothstep(crossing.u);
  return {
    opacity: peak * rise * crossing.ready,
    x: lerp(x0, x1, along),
    y: lerp(y0, y1, along),
    radius: width * lerp(BLOOM_RADIUS.end, BLOOM_RADIUS.mid, rise),
  };
}

/**
 * Each backdrop layer's own opacity, from the backdrops' weights in registry order (later layers on top). The stack
 * then shows each backdrop at exactly its weight, and the dome, drawn over it at `worldOpacity`, fills the rest. Fading
 * a layer by its weight as well would dim it twice and let the page background show through mid-way.
 */
export function layerOpacities(weights: readonly number[]): number[] {
  let sum = 0;
  return weights.map((weight) => {
    sum += weight;
    return sum > 0 ? weight / sum : 0;
  });
}

/** Whether a backdrop's motion runs: never at zero weight, during a crossing (where its layers hold still at rest
 *  and its effects pause, so only the two pictures and the bloom change), under an open page, in a hidden tab or with
 *  reduced motion, where its layers show still. */
export function motionRunning(weight: number, pageOpen: boolean, tabHidden: boolean, reducedMotion: boolean, crossing = false): boolean {
  return weight > 0 && !crossing && !pageOpen && !tabHidden && !reducedMotion;
}

/** Where an image layer is drawn: offset in px and scale about the horizon row, all as a CSS transform. */
export interface LayerPose {
  x: number;
  y: number;
  scale: number;
}

/**
 * An image layer's pose for its depth, its zone's weight and the eased pointer (-1 to 1 across the view each way, 0
 * in the middle). It shifts against the pointer, and as the weight falls it moves down and grows, as if walked away
 * from. Scaled about the horizon row of a `width` by `height` view, and never less than its shifts need, so its
 * edges never show.
 */
export function layerPose(depth: number, weight: number, pointerX: number, pointerY: number, horizon: number, width: number, height: number): LayerPose {
  const away = 1 - Math.min(Math.max(weight, 0), 1);
  const x = -pointerX * depth * PARALLAX_MAX_X_PX;
  const y = -pointerY * depth * PARALLAX_MAX_Y_PX + away * depth * LAYER_PUSH_PX;
  const rest = 1 + depth * (LAYER_REST_SCALE - 1);
  const design = rest + away * depth * (LAYER_PUSH_SCALE - LAYER_REST_SCALE);
  // The room scaling leaves past each edge: half the extra width each side; above and below the horizon row, the
  // extra height in proportion.
  const sideways = width > 0 ? 1 + (2 * Math.abs(x)) / width : 1;
  const vertical = height > 0 ? 1 + (y >= 0 ? y / (horizon * height) : -y / ((1 - horizon) * height)) : 1;
  return { x, y, scale: Math.max(design, sideways, vertical) };
}

/** Whether a view counts as portrait, as the CSS `(orientation: portrait)` query has it: at least as tall as wide. */
export const portraitView = (width: number, height: number) => height >= width;

/** Where a point of a backdrop's images is drawn in a `width` by `height` view before any pose: the cover crop the
 *  CSS draws, the focus column and the horizon row each kept at their own fraction of the view. */
export function coverPoint(backdrop: ZoneBackdrop, point: ImagePoint, width: number, height: number): [x: number, y: number] {
  const scale = Math.max(width / backdrop.size.width, height / backdrop.size.height);
  const drawnWidth = backdrop.size.width * scale;
  const drawnHeight = backdrop.size.height * scale;
  const focusX = portraitView(width, height) ? backdrop.portraitFocusX : backdrop.focusX;
  return [(width - drawnWidth) * focusX + point.x * drawnWidth, (height - drawnHeight) * backdrop.horizon + point.y * drawnHeight];
}

/** Where an object's middle column is, as a fraction of its backdrop's width. */
const objectCentre = ({ rect }: BackdropObject) => rect.x + rect.width / 2;

/**
 * How far, in px, a backdrop wider than a `width` by `height` view is panned sideways at path position t: across its
 * `pan` stretch it brings each object's middle column to the middle of the view in turn, left to right, easing
 * between them so it dwells a little on each; never so far that an edge of the picture shows. 0 for a backdrop with
 * no pan, or one no wider than the view.
 */
export function panOffset(backdrop: ZoneBackdrop, t: number, width: number, height: number): number {
  const { pan, objects } = backdrop;
  if (!pan || !objects?.length) return 0;
  const scale = Math.max(width / backdrop.size.width, height / backdrop.size.height);
  const drawn = backdrop.size.width * scale;
  if (drawn <= width + 0.5) return 0;
  const stops = objects.map(objectCentre).sort((a, b) => a - b);
  const along = clamp01((t - pan[0]) / (pan[1] - pan[0])) * (stops.length - 1);
  const i = Math.min(Math.floor(along), stops.length - 2);
  const centre = stops.length > 1 ? lerp(stops[i], stops[i + 1], smoothstep(along - i)) : stops[0];
  const focusX = portraitView(width, height) ? backdrop.portraitFocusX : backdrop.focusX;
  const restLeft = (width - drawn) * focusX;
  const offset = width / 2 - restLeft - centre * drawn;
  return Math.min(Math.max(offset, width - drawn - restLeft), -restLeft);
}

/** Where a pose moves a point of the view: scaled about the middle of the horizon row (the layers' transform
 *  origin), then shifted. */
export function posePoint([x, y]: readonly [number, number], pose: LayerPose, horizon: number, width: number, height: number): [x: number, y: number] {
  const originX = width / 2;
  const originY = horizon * height;
  return [originX + pose.x + pose.scale * (x - originX), originY + pose.y + pose.scale * (y - originY)];
}

/** A box in the view, in px. */
export interface ViewBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Where a backdrop object's rect shows in the view before any pose: the cover crop the CSS draws. */
export function objectRestBox(backdrop: ZoneBackdrop, object: BackdropObject, width: number, height: number): ViewBox {
  const { rect } = object;
  const [left, top] = coverPoint(backdrop, rect, width, height);
  const [right, bottom] = coverPoint(backdrop, { x: rect.x + rect.width, y: rect.y + rect.height }, width, height);
  return { left, top, width: right - left, height: bottom - top };
}

/** Where a backdrop object shows in the view in a pose: its rest box moved as its layer is. */
export function objectBox(backdrop: ZoneBackdrop, object: BackdropObject, pose: LayerPose, width: number, height: number): ViewBox {
  const rest = objectRestBox(backdrop, object, width, height);
  const [left, top] = posePoint([rest.left, rest.top], pose, backdrop.horizon, width, height);
  return { left, top, width: rest.width * pose.scale, height: rest.height * pose.scale };
}

/** Where a backdrop object's top shows in the view in a pose. */
export function objectTop(backdrop: ZoneBackdrop, object: BackdropObject, pose: LayerPose, width: number, height: number): [x: number, y: number] {
  return posePoint(coverPoint(backdrop, object.top, width, height), pose, backdrop.horizon, width, height);
}

/** Where a point of the view (px) lands on a backdrop's images in a pose, as fractions of them: the inverse of
 *  `posePoint` and `coverPoint`. */
export function imagePointAt(backdrop: ZoneBackdrop, pose: LayerPose, x: number, y: number, width: number, height: number): ImagePoint {
  const originX = width / 2;
  const originY = backdrop.horizon * height;
  const restX = originX + (x - originX - pose.x) / pose.scale;
  const restY = originY + (y - originY - pose.y) / pose.scale;
  const [left, top] = coverPoint(backdrop, { x: 0, y: 0 }, width, height);
  const [right, bottom] = coverPoint(backdrop, { x: 1, y: 1 }, width, height);
  return { x: (restX - left) / (right - left), y: (restY - top) / (bottom - top) };
}

/** Whether a point lies inside a polygon (even-odd). */
export function insidePolygon(polygon: readonly ImagePoint[], { x, y }: ImagePoint): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** The box in the view that takes presses for an object in a pose: its rect and its surfaces (`areas`) together. */
export function objectHitBox(backdrop: ZoneBackdrop, object: BackdropObject, pose: LayerPose, width: number, height: number): ViewBox {
  const box = objectBox(backdrop, object, pose, width, height);
  let [left, top, right, bottom] = [box.left, box.top, box.left + box.width, box.top + box.height];
  for (const point of object.areas?.flat() ?? []) {
    const [x, y] = posePoint(coverPoint(backdrop, point, width, height), pose, backdrop.horizon, width, height);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  return { left, top, width: right - left, height: bottom - top };
}

/** One mote of light: its place as fractions of the view, its size in px and opacity, the seconds of its drift and
 *  where in it it starts (0 to 1), and how far it rises and strays sideways over it, in px. */
export interface Mote {
  x: number;
  y: number;
  size: number;
  opacity: number;
  period: number;
  phase: number;
  rise: number;
  drift: number;
}

/** The motes of light for a sun at column `sunX` (a fraction of the view's width), fixed by `seed`: bunched toward
 *  the sun's side and brightest there, none in the lowest part of the view. */
export function moteField(sunX: number, seed: number = MOTE_SEED, count: number = MOTE_COUNT): Mote[] {
  const next = seeded(seed);
  const between = ([min, max]: readonly [number, number]) => min + (max - min) * next();
  const motes: Mote[] = [];
  for (let i = 0; i < count; i++) {
    const away = Math.pow(next(), MOTE_SUN_BIAS);
    const side = next() < 0.5 ? -1 : 1;
    let x = sunX + side * away;
    // Folded back into the view at either edge.
    if (x < 0) x = -x;
    if (x > 1) x = 2 - x;
    x = clamp01(x);
    const [dim, bright] = MOTE_OPACITY;
    motes.push({
      x,
      y: 0.08 + next() * (MOTE_LOWEST - 0.08),
      size: between(MOTE_SIZE_PX),
      // Brightest at the sun's column, dimmer further from it, with a little spread of its own.
      opacity: dim + (bright - dim) * (1 - away) * (0.7 + 0.3 * next()),
      period: between(MOTE_PERIOD_SECONDS),
      phase: next(),
      rise: between(MOTE_RISE_PX),
      drift: (next() * 2 - 1) * MOTE_DRIFT_PX,
    });
  }
  return motes;
}

export type StarTierName = keyof typeof STAR_TIERS;

/** One star: its tier, its place as fractions of the view, its size in px, its colour, and its opacity range. A star
 *  that twinkles fades between the ends of its range on its own period and phase (0 to 1 of a period); one that
 *  doesn't sits at a single opacity, with `min` equal to `max`. */
export interface Star {
  tier: StarTierName;
  x: number;
  y: number;
  size: number;
  color: string;
  min: number;
  max: number;
  twinkles: boolean;
  period: number;
  phase: number;
}

/** The share of stars kept at a column `x`, `glowX` being the glow's centre column: none within
 *  `STAR_GLOW_CLEAR_HALF_WIDTH` of it, rising smoothly to all of them over `STAR_GLOW_FADE_WIDTH`. */
export function starKeep(x: number, glowX: number): number {
  const t = Math.min(Math.max((Math.abs(x - glowX) - STAR_GLOW_CLEAR_HALF_WIDTH) / STAR_GLOW_FADE_WIDTH, 0), 1);
  return t * t * (3 - 2 * t);
}

/**
 * The star field for a sky over a horizon at `horizon` of the view's height, with its dawn glow centred on column
 * `glowX`, fixed by `seed`. Each tier's count of stars, bunched toward the top, none in the lowest part of the sky,
 * and thinned out to none around the glow's column.
 */
export function starField(horizon: number, glowX: number, seed: number = STAR_SEED, tiers: Record<StarTierName, StarTier> = STAR_TIERS): Star[] {
  const next = seeded(seed);
  const between = ([min, max]: readonly [number, number]) => min + (max - min) * next();
  const stars: Star[] = [];
  for (const [tier, { count, sizePx, opacity, twinkles }] of Object.entries(tiers) as [StarTierName, StarTier][]) {
    for (let i = 0; i < count; i++) {
      let x = next();
      while (next() >= starKeep(x, glowX)) x = next();
      const y = Math.pow(next(), STAR_TOP_BIAS) * STAR_SKY_FRACTION * horizon;
      const size = between(sizePx);
      const level = between(opacity);
      const tinted = tier === 'bright' && next() < STAR_TINT_SHARE;
      stars.push({
        tier,
        x,
        y,
        size,
        color: tinted ? STAR_TINTS[Math.floor(next() * STAR_TINTS.length)] : STAR_COLOR,
        min: twinkles ? opacity[0] : level,
        max: twinkles ? opacity[1] : level,
        twinkles,
        period: twinkles ? between(STAR_PERIOD_SECONDS) : 0,
        phase: twinkles ? next() : 0,
      });
    }
  }
  return stars;
}

/** Gain of a zone's ambient bed: follows the zone's weight, and goes to 0 under an open page. */
export function ambientLevel(weight: number, pageOpen: boolean, peak: number = AMBIENT_GAIN): number {
  if (pageOpen) return 0;
  return peak * Math.min(Math.max(weight, 0), 1);
}

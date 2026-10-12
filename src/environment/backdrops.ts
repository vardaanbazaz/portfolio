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
  STAR_TINT_SHARE,
  STAR_TINTS,
  STAR_TOP_BIAS,
  type StarTier,
} from '../scene/tuning';
import type { SectionId } from '../sections/contract';
import landingAmbient from './assets/landing-ambient.m4a';
import landingBase from './assets/landing-base.webp';
import landingGround from './assets/landing-ground.webp';
import { ZONES, zoneWeight, type ZoneId, type ZoneTable } from './zones';

/** One still image of a zone's backdrop. All of a zone's images share one size, so they line up when drawn the same
 *  way. `depth` is how near it is: 0 never moves, 1 moves the full amounts in `tuning.ts`. */
export interface BackdropImage {
  src: string;
  depth: number;
}

/** Drawn by code over a zone's images: a mist band drifting along the horizon, and faint stars fading in the sky. */
export type BackdropEffect = 'mist' | 'stars';

/** A zone's world behind the transparent canvas: still image layers moved by code, effects over them, and an
 *  optional ambient sound bed. All bundled; nothing is fetched from anywhere else. */
export interface ZoneBackdrop {
  zone: ZoneId;
  /** Back to front. Stars go just over the first; mist over the last. */
  layers: readonly BackdropImage[];
  /** The horizon row, as a fraction of the images' height from the top. Kept at that height of the view on every
   *  screen, and where the mist sits. */
  horizon: number;
  /** Horizontal focus of the cover crop (0 left, 1 right) on landscape screens, and on screens taller than wide. */
  focusX: number;
  portraitFocusX: number;
  effects: readonly BackdropEffect[];
  ambient?: string;
}

/** At most one per zone. A new world is one more entry here; nothing else changes. */
export const BACKDROPS: readonly ZoneBackdrop[] = [
  {
    zone: 'landing',
    layers: [
      { src: landingBase, depth: 0.3 },
      { src: landingGround, depth: 1 },
    ],
    // Row 725 of 1152: the first row of dark land, under the pale strip.
    horizon: 0.629,
    // The glow's centre (column 1031 of 2048), so it stays in frame on the narrowest phones.
    focusX: 0.503,
    portraitFocusX: 0.503,
    effects: ['mist', 'stars'],
    ambient: landingAmbient,
  },
];

/** Below this a backdrop's weight counts as 0. The camera eases toward the scroll position and never quite arrives,
 *  so without it the landing's weight at About would stay a hair above 0 and its motion would never stop. */
export const BACKDROP_MIN_WEIGHT = 1e-3;

/** A backdrop's weight at path position t: its zone's weight, snapped to 0 below `BACKDROP_MIN_WEIGHT`. */
export function backdropWeight(t: number, zone: ZoneId, zones: ZoneTable = ZONES): number {
  const weight = zoneWeight(t, zone, zones);
  return weight < BACKDROP_MIN_WEIGHT ? 0 : weight;
}

/** How much of the drawn sky dome and grid shows at path position t: whatever the backdrops' zones leave. 0 where a
 *  backdrop's zone applies fully (nothing drawn there), 1 where no backdrop's zone has any weight. */
export function worldOpacity(t: number, backdrops: readonly ZoneBackdrop[] = BACKDROPS, zones: ZoneTable = ZONES): number {
  let covered = 0;
  for (const { zone } of backdrops) covered += backdropWeight(t, zone, zones);
  return Math.min(Math.max(1 - covered, 0), 1);
}

/** How much of a section's visuals shows at path position t: whatever the other zones' backdrops leave, so nothing
 *  of one zone is drawn over another's backdrop. A backdrop in the section's own zone doesn't hide it. 0 at the
 *  landing, rising with the dome on the way to About, 1 wherever no other zone's backdrop has any weight. */
export function sectionOpacity(
  t: number,
  section: SectionId,
  backdrops: readonly ZoneBackdrop[] = BACKDROPS,
  zones: ZoneTable = ZONES,
): number {
  let covered = 0;
  for (const { zone } of backdrops) if (zone !== section) covered += backdropWeight(t, zone, zones);
  return Math.min(Math.max(1 - covered, 0), 1);
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

/** Whether a backdrop's motion runs: never at zero weight, under an open page, in a hidden tab or with reduced
 *  motion, where its layers show still. */
export function motionRunning(weight: number, pageOpen: boolean, tabHidden: boolean, reducedMotion: boolean): boolean {
  return weight > 0 && !pageOpen && !tabHidden && !reducedMotion;
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

/** A small seeded generator (mulberry32): the same seed gives the same numbers on every load. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
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

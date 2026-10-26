import { seeded } from '../visuals/seeded';

/**
 * The About page's look: stepping under the banyan. The page opens under a painting of its canopy seen from below,
 * the light breaking through near the top, fixed to the view while the page's text scrolls over it and dimming into
 * a quiet green shade as the visitor reads down. The painting itself holds still; small spots of sunlight flicker in
 * its bright gaps, a warm glow breathes slowly over the light, and a few motes drift in it. Every value is here; `Canopy.tsx` hands them to `index.css` as custom properties. Loaded only with the About
 * page, and the painting only once the page opens or its marker is hovered or focused.
 *
 * Contrast: text over the painting sits on a soft local shade where the painting behind it is too light. Against
 * the lightest pixel behind each line (at every scroll, glow and spots at their brightest, motes passing), body text holds at least 7:1 and headings and the source line at least 4.5:1, measured in the
 * browser by `tests/e2e/about-canopy.spec.ts`. On the plain shade the bound in `tests/unit/canopy.test.ts` holds.
 */

/** The shade the painting fades into: lighter at the top, as if the light came from above. Cooler and darker than
 *  the grove's own shadow (about #2b3027). */
export const CANOPY_SHADE_TOP = '#1a2823';
export const CANOPY_SHADE_BOTTOM = '#0e1714';

/** The painting: its height over its width (2256 / 2640 at the source), and the light core, as fractions of it. */
export const CANOPY_IMAGE_ASPECT = 2256 / 2640;
export const CANOPY_CORE = { x: 0.41, y: 0.36 } as const;

/** The painting fills the view's width at its own aspect, and is never shorter than this share of the view's height.
 *  On a screen taller than wide that crops its sides; it is then placed so this fraction of what is cropped falls on
 *  the left, which keeps the light core in view. */
export const CANOPY_MIN_HEIGHT_VH = 100;
export const CANOPY_FOCUS_X = 0.37;

/** The painting is opaque down to the first fraction of its height and gone by the second, easing out between them:
 *  its calm lower third melts into the shade with no edge. */
export const CANOPY_FADE: [start: number, end: number] = [0.55, 1];

/** The painting is fixed to the view and never moves with the scroll. As the page scrolls it dims into the shade:
 *  full strength at the top, easing to `CANOPY_DIM_MIN` opacity by `CANOPY_DIM_DISTANCE` view heights of scroll, then
 *  holding there. Scroll-driven CSS, opacity only: a veil of the shade over the painting, at one less its strength.
 *  Without scroll-driven animation it holds at `CANOPY_DIM_FALLBACK`, halfway between. */
export const CANOPY_DIM_MIN = 0.25;
export const CANOPY_DIM_DISTANCE = 1.2;
export const CANOPY_DIM_EASING = 'ease-in-out';
export const CANOPY_DIM_FALLBACK = (1 + CANOPY_DIM_MIN) / 2;

/** The light through the leaves: a warm gold, as `r g b` for `rgb(... / alpha)` in CSS. */
export const CANOPY_LIGHT_RGB = [255, 224, 160] as const;

/** Text on the page: warm off-white for reading, Sulphur Yellow for headings, a softer warm tone for the verse's
 *  source. */
export const ABOUT_TEXT_COLOR = '#f4efe4';
export const ABOUT_HEADING_COLOR = '#cecaaf';
export const ABOUT_SOURCE_COLOR = '#d8cfbc';

/** The spiral dividers: their colour and opacity, the spiral's turns and radius and the line's width, in px. */
export const DIVIDER_COLOR = '#cecaaf';
export const DIVIDER_OPACITY = 0.55;
export const DIVIDER_SPIRAL_TURNS = 2.5;
export const DIVIDER_SPIRAL_RADIUS_PX = 8;
export const DIVIDER_STROKE_PX = 1.25;

/** Stepping under the canopy: on opening, a wash of the grove's gold light over the page fades out over this many
 *  seconds, starting at this opacity. None with reduced motion. */
export const CANOPY_WASH_COLOR = '#ffcf6e';
export const CANOPY_WASH_OPACITY = 0.6;
export const CANOPY_WASH_SECONDS = 0.6;

/** The breathing glow over the light core: a soft round gradient of the light's colour, this wide as a share of the
 *  painting's width, its alpha falling through these stops from its centre (0%) to its edge (100%). It breathes from
 *  its resting opacity up to its brightest and back over one period, in seconds; with reduced motion it holds at
 *  rest. Pre-blurred: no filter is ever applied. */
export const GLOW_WIDTH = 0.5;
export const GLOW_FALLOFF = [0.5, 0.28, 0.1, 0] as const;
export const GLOW_OPACITY = { rest: 0.55, bright: 1 } as const;
export const GLOW_PERIOD_SECONDS = 10;

/** The motes: the grove's warm points (its `.backdrop-mote` and `MOTE_COLOR`), clearly visible, drifting only over
 *  the painting. Their places are fractions of the painting; they start in its middle band and rise. */
export const CANOPY_MOTE_COUNT = 12;
export const CANOPY_MOTE_SEED = 2047;
export const CANOPY_MOTE_OPACITY: [min: number, max: number] = [0.25, 0.5];
export const CANOPY_MOTE_SIZE_PX: [min: number, max: number] = [2, 5];
export const CANOPY_MOTE_PERIOD_SECONDS: [min: number, max: number] = [18, 30];
export const CANOPY_MOTE_RISE_PX: [min: number, max: number] = [140, 320];
export const CANOPY_MOTE_DRIFT_PX = 40;
/** Motes start between these fractions of the painting's height from its top. */
export const CANOPY_MOTE_START: [top: number, bottom: number] = [0.3, 0.6];

/** Sunlight through moving leaves: small soft warm spots, each centred on one of the painting's bright gaps (measured
 *  from the image: the local brightness peaks away from the light core, which has the glow) and sized to stay inside
 *  it, as fractions of the painting's width. Each flickers between dim and bright through `CANOPY_SPOT_FLICKER` (its
 *  offsets in the cycle and its levels from dim, 0, to bright, 1, brightest at `CANOPY_SPOT_BRIGHTEST`), on its own
 *  period between the bounds, in seconds, starting at its own point in it. Opacity only; held at dim with reduced
 *  motion. */
export const CANOPY_SPOTS = [
  { x: 0.33, y: 0.339, size: 0.034 },
  { x: 0.051, y: 0.322, size: 0.026 },
  { x: 0.518, y: 0.197, size: 0.028 },
  { x: 0.519, y: 0.278, size: 0.03 },
  { x: 0.21, y: 0.14, size: 0.024 },
  { x: 0.379, y: 0.249, size: 0.022 },
] as const;
export const CANOPY_SPOT_OPACITY = { dim: 0.1, bright: 0.6 } as const;
export const CANOPY_SPOT_PERIOD_SECONDS: [min: number, max: number] = [2, 5];
export const CANOPY_SPOT_SEED = 811;
export const CANOPY_SPOT_FLICKER: readonly (readonly [offset: number, level: number])[] = [
  [0, 0],
  [0.17, 0.55],
  [0.26, 0.2],
  [0.4, 1],
  [0.53, 0.35],
  [0.68, 0.75],
  [0.81, 0.15],
  [1, 0],
];
export const CANOPY_SPOT_BRIGHTEST = 0.4;

/** A glow's background: one radial gradient of the light's colour through `GLOW_FALLOFF`. */
export function glowBackground(): string {
  const [r, g, b] = CANOPY_LIGHT_RGB;
  const stops = GLOW_FALLOFF.map((alpha, i) => `rgb(${r} ${g} ${b} / ${alpha}) ${Math.round((i * 100) / (GLOW_FALLOFF.length - 1))}%`);
  return `radial-gradient(closest-side, ${stops.join(', ')})`;
}

/** The painting's fade, as a mask: opaque to `CANOPY_FADE[0]`, then easing (smoothstep) to clear at `CANOPY_FADE[1]`. */
export function fadeMask([start, end]: readonly [number, number] = CANOPY_FADE, steps = 8): string {
  const stops = Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const alpha = 1 - t * t * (3 - 2 * t);
    return `rgb(0 0 0 / ${alpha.toFixed(3)}) ${((start + (end - start) * t) * 100).toFixed(1)}%`;
  });
  return `linear-gradient(to bottom, ${stops.join(', ')})`;
}

/** One mote: its place as fractions of the painting, its size in px and opacity, the seconds of its rise and where in it
 *  it starts (0 to 1), and how far it rises and strays sideways over it, in px. */
export interface CanopyMote {
  x: number;
  y: number;
  size: number;
  opacity: number;
  period: number;
  phase: number;
  rise: number;
  drift: number;
}

export function canopyMotes(seed: number = CANOPY_MOTE_SEED, count: number = CANOPY_MOTE_COUNT): CanopyMote[] {
  const next = seeded(seed);
  const between = ([min, max]: readonly [number, number]) => min + (max - min) * next();
  return Array.from({ length: count }, () => ({
    x: between([0.04, 0.96]),
    y: between(CANOPY_MOTE_START),
    size: between(CANOPY_MOTE_SIZE_PX),
    opacity: between(CANOPY_MOTE_OPACITY),
    period: between(CANOPY_MOTE_PERIOD_SECONDS),
    phase: next(),
    rise: between(CANOPY_MOTE_RISE_PX),
    drift: (next() * 2 - 1) * CANOPY_MOTE_DRIFT_PX,
  }));
}

/** One spot: its place and size as fractions of the painting, the seconds of its flicker, and where in it it starts
 *  (0 to 1). The periods are spread across the bounds and never repeat, so no two spots keep step. */
export interface CanopySpot {
  x: number;
  y: number;
  size: number;
  period: number;
  phase: number;
}

export function canopySpots(seed: number = CANOPY_SPOT_SEED): CanopySpot[] {
  const next = seeded(seed);
  const [min, max] = CANOPY_SPOT_PERIOD_SECONDS;
  const band = (max - min) / CANOPY_SPOTS.length;
  // One period in each equal band of the bounds, at a seeded point inside it, dealt out in a seeded order.
  const periods = CANOPY_SPOTS.map((_, i) => min + band * (i + 0.15 + 0.7 * next()));
  for (let i = periods.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [periods[i], periods[j]] = [periods[j], periods[i]];
  }
  return CANOPY_SPOTS.map((spot, i) => ({ ...spot, period: periods[i], phase: next() }));
}

/** A spot's flicker as keyframes: `CANOPY_SPOT_FLICKER`'s levels as opacities between dim and bright, eased between. */
export function spotKeyframes(): Keyframe[] {
  const { dim, bright } = CANOPY_SPOT_OPACITY;
  return CANOPY_SPOT_FLICKER.map(([offset, level]) => ({ offset, opacity: dim + (bright - dim) * level, easing: 'ease-in-out' }));
}

/** The divider's spiral, an Archimedean one winding out from the centre of a square of side `2 * radius`, as an SVG
 *  path: the carving on the grove's stone, reduced to a mark. */
export function spiralPath(turns: number = DIVIDER_SPIRAL_TURNS, radius: number = DIVIDER_SPIRAL_RADIUS_PX): string {
  const steps = Math.ceil(turns * 32);
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * turns * 2 * Math.PI;
    const r = (i / steps) * (radius - DIVIDER_STROKE_PX / 2);
    points.push(`${(radius + r * Math.cos(angle)).toFixed(2)} ${(radius + r * Math.sin(angle)).toFixed(2)}`);
  }
  return `M${points.join('L')}`;
}

/** The soft local shade behind a block of text over the painting: the shade's own colour over the block, feathering
 *  out to nothing over this many px beyond its edges. Static, and drawn without any filter. Each block has its own
 *  opacity, the lowest (in steps of 0.05) that keeps its text's contrast, measured at 1920x1080, 1366x768 and 390x844:
 *  lighter further down, where the painting has already dimmed by the time the block is read over it. The heading is
 *  large text, held to 4.5:1, so it needs a little less than the verse below it. */
export const TEXT_SHADE_COLOR = CANOPY_SHADE_BOTTOM;
export const TEXT_SHADE_OPACITY = { heading: 0.7, verse: 0.75, education: 0.75, location: 0.5, links: 0.45 } as const;
export type TextShadeBlock = keyof typeof TEXT_SHADE_OPACITY;
export const TEXT_SHADE_FEATHER_PX = 96;

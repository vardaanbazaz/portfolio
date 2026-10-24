import { seeded } from '../visuals/seeded';

/**
 * The About page's look: the quiet shade under the banyan's canopy. A cool green deepening downward, a few soft
 * patches of warm light through the leaves, and a few motes rising in them. Every value is here; `Canopy.tsx` hands
 * them to `index.css` as custom properties. Loaded only with the About page.
 *
 * Contrast: the lightest the background can be is its top colour with every patch at its brightest and a mote at
 * its brightest, all over the same point (they never all meet; this is the bound). Against that, body text holds at
 * least 7:1 and headings and the source line at least 4.5:1 (checked in `tests/unit/canopy.test.ts`, and measured
 * in the browser by `tests/e2e/about-canopy.spec.ts`).
 */

/** The shade: lighter at the top, as if the light came from above. Cooler and darker than the grove's own shadow
 *  (about #2b3027) so text stays clear over the light patches. */
export const CANOPY_SHADE_TOP = '#1a2823';
export const CANOPY_SHADE_BOTTOM = '#0e1714';

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

/** Stepping under the canopy: on opening, a wash of the grove's gold light over the shade fades out over this many
 *  seconds, starting at this opacity. None with reduced motion. */
export const CANOPY_WASH_COLOR = '#ffcf6e';
export const CANOPY_WASH_OPACITY = 0.6;
export const CANOPY_WASH_SECONDS = 0.6;

/** Each light patch's opacity through its cycle, as a share of its own strength: it rests, brightens, dims, and
 *  comes back to rest. With reduced motion it holds still at rest. */
export const PATCH_OPACITY = { dim: 0.45, rest: 0.7, bright: 1 } as const;

/** A patch is one element with a few soft lobes of light, each a radial gradient fading out through these alpha
 *  stops, spaced evenly from its centre (0%) to its edge (100%). Pre-blurred: no filter is ever applied. */
export const PATCH_FALLOFF = [1, 0.55, 0.18, 0] as const;

/** One soft lobe of a patch: its centre and size as % of the patch. */
export interface PatchLobe {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One patch of light: its centre as fractions of the view, its size in vmax, its strength (its opacity at its
 *  brightest), the vmax it strays over half a cycle, its cycle in seconds and where in it it starts (0 to 1), and its
 *  lobes. Each patch is a layer of its own, and under software compositing the frame rate while scrolling falls with
 *  their total area, so together they cover only about half the view. */
export interface Patch {
  x: number;
  y: number;
  w: number;
  h: number;
  strength: number;
  dx: number;
  dy: number;
  period: number;
  phase: number;
  lobes: readonly PatchLobe[];
}

export const PATCHES: readonly Patch[] = [
  {
    x: 0.24,
    y: 0.12,
    w: 44,
    h: 30,
    strength: 0.055,
    dx: 3,
    dy: 2,
    period: 24,
    phase: 0,
    lobes: [
      { x: 42, y: 46, w: 70, h: 62 },
      { x: 66, y: 60, w: 48, h: 40 },
      { x: 30, y: 30, w: 36, h: 30 },
    ],
  },
  {
    x: 0.8,
    y: 0.4,
    w: 38,
    h: 28,
    strength: 0.05,
    dx: -3,
    dy: 2.5,
    period: 28,
    phase: 0.35,
    lobes: [
      { x: 52, y: 48, w: 64, h: 70 },
      { x: 30, y: 62, w: 42, h: 36 },
    ],
  },
  {
    x: 0.36,
    y: 0.8,
    w: 34,
    h: 24,
    strength: 0.045,
    dx: 2.5,
    dy: -2,
    period: 21,
    phase: 0.7,
    lobes: [
      { x: 50, y: 50, w: 72, h: 60 },
      { x: 72, y: 36, w: 40, h: 44 },
      { x: 28, y: 64, w: 34, h: 30 },
    ],
  },
];

/** The motes: the grove's warm points (its `.backdrop-mote` and `MOTE_COLOR`), fewer and much fainter here so that
 *  even one passing behind text keeps it readable. They start in the lower part of the view and rise. */
export const CANOPY_MOTE_COUNT = 12;
export const CANOPY_MOTE_SEED = 2047;
export const CANOPY_MOTE_OPACITY: [min: number, max: number] = [0.035, 0.07];
export const CANOPY_MOTE_SIZE_PX: [min: number, max: number] = [2, 5];
export const CANOPY_MOTE_PERIOD_SECONDS: [min: number, max: number] = [18, 30];
export const CANOPY_MOTE_RISE_PX: [min: number, max: number] = [140, 320];
export const CANOPY_MOTE_DRIFT_PX = 40;
/** Motes start between these fractions of the view's height from the top. */
export const CANOPY_MOTE_START: [top: number, bottom: number] = [0.35, 0.95];

/** One mote: its place as fractions of the view, its size in px and opacity, the seconds of its rise and where in it
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

/** A patch's background: its lobes, each fading out through `PATCH_FALLOFF`, all in the light's one colour. Layers
 *  of one opaque colour never add up past it, so a patch is never brighter than its own opacity. */
export function patchBackground(patch: Patch): string {
  const [r, g, b] = CANOPY_LIGHT_RGB;
  const stops = PATCH_FALLOFF.map((alpha, i) => `rgb(${r} ${g} ${b} / ${alpha}) ${Math.round((i * 100) / (PATCH_FALLOFF.length - 1))}%`);
  return patch.lobes
    .map(({ x, y, w, h }) => `radial-gradient(${w / 2}% ${h / 2}% at ${x}% ${y}%, ${stops.join(', ')})`)
    .join(', ');
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

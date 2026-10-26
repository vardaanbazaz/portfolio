import {
  RAIN_DARK_SHARE,
  RAIN_DEPTHS,
  RAIN_LIGHT_LUMA,
  RAIN_MAX_DROPS,
  RAIN_QUALITY_SHARE,
  RAIN_REFERENCE_VIEW,
  RAIN_TINT_WHITE,
  RAIN_WIND,
} from '../scene/tuning';
import type { Quality } from '../visuals/shared';
import { CITY_LIGHT } from './cityLight';

/**
 * The night city's rain, as single drops drawn on one 2D canvas: three depths, each drop a thin streak whose length
 * follows its speed, tapered at the top, falling at the shared wind's slant (which drifts slowly) plus its own small
 * difference. Placed and timed at random, so nothing repeats. Each drop takes the colour and brightness of the city's
 * light behind it (`CITY_LIGHT`): nearly invisible against the dark sky, catching the signs' light in front of them.
 * Plain arithmetic over a canvas context; the player owns the canvas and calls `stepRain` and `drawRain` each frame.
 */

export type RainDepth = keyof typeof RAIN_DEPTHS;
export const RAIN_DEPTH_ORDER: readonly RainDepth[] = ['far', 'near', 'close'];

export interface Drop {
  depth: RainDepth;
  /** Its head (lowest point), in CSS px of the view. */
  x: number;
  y: number;
  /** px per second, at this view's height. */
  speed: number;
  /** Its own slant, added to the wind's, in radians. */
  slant: number;
}

export interface RainField {
  width: number;
  height: number;
  /** The drop count it was made for (`dropCount`). */
  count: number;
  drops: Drop[];
  /** Seconds the rain has fallen: the wind's clock. */
  time: number;
}

/** How many drops a `width` by `height` view gets at a quality: `RAIN_MAX_DROPS` at the reference view and above,
 *  fewer with a smaller screen area, fewer again at the lower quality step. */
export function dropCount(width: number, height: number, quality: Quality): number {
  const area = Math.min((width * height) / (RAIN_REFERENCE_VIEW.width * RAIN_REFERENCE_VIEW.height), 1);
  return Math.round(RAIN_MAX_DROPS * area * RAIN_QUALITY_SHARE[quality]);
}

/** The wind's slant at a time, in radians from straight down (positive leans the fall to the right): a base that
 *  drifts slowly between two unrelated periods, so it never visibly repeats. */
export function windAt(time: number): number {
  const { baseDegrees, driftDegrees, periodsSeconds } = RAIN_WIND;
  const [a, b] = periodsSeconds;
  const drift = 0.6 * Math.sin((2 * Math.PI * time) / a) + 0.4 * Math.sin((2 * Math.PI * time) / b + 1.3);
  return ((baseDegrees + driftDegrees * drift) * Math.PI) / 180;
}

/** Speeds are given at a 1080 px tall view; a smaller view scales them, so a drop crosses it in the same time. */
const speedScale = (height: number) => height / RAIN_REFERENCE_VIEW.height;

/** The widest the fall can lean, so drops start far enough to the side to cover the view at any wind. */
const maxLean = () => ((Math.abs(RAIN_WIND.baseDegrees) + RAIN_WIND.driftDegrees + RAIN_WIND.dropDegrees) * Math.PI) / 180;

/** A new drop of a depth: its speed and slant drawn afresh, at a random column (wide enough for the lean). Its height
 *  is random over the view (`fill`) or just above it. */
function spawn(depth: RainDepth, width: number, height: number, random: () => number, fill: boolean): Drop {
  const { speed: [lo, hi] } = RAIN_DEPTHS[depth];
  const speed = (lo + (hi - lo) * random()) * speedScale(height);
  const margin = height * Math.tan(maxLean());
  const length = speed * RAIN_DEPTHS[depth].streakSeconds;
  return {
    depth,
    x: -margin + (width + 2 * margin) * random(),
    // Above the view by up to a fifth of its height, so the drops arrive at random times, not in rows.
    y: fill ? height * random() : -length * random() - 0.2 * height * random(),
    speed,
    slant: (((2 * random() - 1) * RAIN_WIND.dropDegrees) * Math.PI) / 180,
  };
}

/** A field of `count` drops over a `width` by `height` view, shared among the depths, spread over the whole view. */
export function createRain(width: number, height: number, count: number, random: () => number = Math.random): RainField {
  const drops: Drop[] = [];
  for (const depth of RAIN_DEPTH_ORDER) {
    const n = Math.round(count * RAIN_DEPTHS[depth].share);
    for (let i = 0; i < n; i++) drops.push(spawn(depth, width, height, random, true));
  }
  return { width, height, count, drops, time: 0 };
}

/** The direction of a drop's fall, as [x, y] per unit of its speed. */
const fallOf = (drop: Drop, wind: number): [x: number, y: number] => [Math.sin(wind + drop.slant), Math.cos(wind + drop.slant)];

/** Moves every drop on by `dt` seconds; one that has left the view starts again above it, at a new column and speed. */
export function stepRain(field: RainField, dt: number, random: () => number = Math.random) {
  field.time += dt;
  const wind = windAt(field.time);
  const margin = field.height * Math.tan(maxLean());
  for (let i = 0; i < field.drops.length; i++) {
    const drop = field.drops[i];
    const [fx, fy] = fallOf(drop, wind);
    drop.x += fx * drop.speed * dt;
    drop.y += fy * drop.speed * dt;
    const length = drop.speed * RAIN_DEPTHS[drop.depth].streakSeconds;
    if (drop.y - length > field.height || drop.x < -2 * margin || drop.x > field.width + 2 * margin) {
      field.drops[i] = spawn(drop.depth, field.width, field.height, random, false);
    }
  }
}

/** A palette colour of the light map as a drop shows it: its hue lifted to full brightness and mixed toward white,
 *  as a drop catches light; and how much it lights the drop (0 on the dark sky, 1 at the brightest signs). */
export function dropTint([r, g, b]: readonly [number, number, number]): { color: string; light: number } {
  const top = Math.max(r, g, b, 1);
  const lift = (c: number) => Math.round((c / top) * 255 * (1 - RAIN_TINT_WHITE) + 255 * RAIN_TINT_WHITE);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const [dark, bright] = RAIN_LIGHT_LUMA;
  const light = Math.min(Math.max((luma - dark) / (bright - dark), 0), 1);
  return { color: `rgb(${lift(r)} ${lift(g)} ${lift(b)})`, light };
}

const TINTS = CITY_LIGHT.palette.map(dropTint);

/** The palette index of the city's light at a point of its painting (fractions of it); outside it, the nearest
 *  edge cell. */
export function lightIndexAt(fx: number, fy: number): number {
  const { width, height, cells } = CITY_LIGHT;
  const x = Math.min(Math.max(Math.floor(fx * width), 0), width - 1);
  const y = Math.min(Math.max(Math.floor(fy * height), 0), height - 1);
  return parseInt(cells[y * width + x], 36);
}

/** Where a point of the view lands on the city's painting: x and y each scaled and shifted (the cover crop and the
 *  layer's pose, which only scale and move it). */
export interface ViewToImage {
  ax: number;
  bx: number;
  ay: number;
  by: number;
}

/** Each depth's share of its brightness drawn now, 0 to 1: the far and close drops fade in after a crossing. */
export type DepthGains = Record<RainDepth, number>;

type Context = Pick<
  CanvasRenderingContext2D,
  'beginPath' | 'moveTo' | 'lineTo' | 'closePath' | 'fill' | 'clearRect' | 'globalAlpha' | 'fillStyle'
>;

/** Adds a drop's streak to the path: a thin triangle from its tail (a point, the taper) to its head (`width` wide). */
function streak(g: Context, x: number, y: number, fx: number, fy: number, length: number, width: number) {
  const half = width / 2;
  g.moveTo(x - fx * length, y - fy * length);
  g.lineTo(x - fy * half, y + fx * half);
  g.lineTo(x + fx * half * 0.6, y + fy * half * 0.6);
  g.lineTo(x + fy * half, y - fx * half);
  g.closePath();
}

/** Each frame's drops, grouped by depth and the colour behind them, so each group is one path and one fill. */
const groups = new Map<number, Drop[]>();

/** Draws the field into a context already scaled to CSS px: every drop of a depth with any gain, grouped by depth and
 *  palette colour so each group is a single fill at that colour's brightness. The close drops are soft: three passes,
 *  wide and faint to narrow. */
export function drawRain(g: Context, field: RainField, toImage: ViewToImage, gains: DepthGains) {
  g.clearRect(0, 0, field.width, field.height);
  const wind = windAt(field.time);
  groups.clear();
  const palette = TINTS.length;
  for (const drop of field.drops) {
    if (gains[drop.depth] <= 0) continue;
    const index = lightIndexAt(toImage.ax * drop.x + toImage.bx, toImage.ay * drop.y + toImage.by);
    const key = RAIN_DEPTH_ORDER.indexOf(drop.depth) * palette + index;
    let list = groups.get(key);
    if (!list) groups.set(key, (list = []));
    list.push(drop);
  }
  for (const [key, drops] of groups) {
    const depth = RAIN_DEPTH_ORDER[Math.floor(key / palette)];
    const { color, light } = TINTS[key % palette];
    const { alpha, width, streakSeconds, soft } = RAIN_DEPTHS[depth];
    const strength = alpha * (RAIN_DARK_SHARE + (1 - RAIN_DARK_SHARE) * light) * gains[depth];
    g.fillStyle = color;
    for (const [widen, share] of soft ? SOFT_PASSES : SHARP_PASS) {
      g.globalAlpha = strength * share;
      g.beginPath();
      for (const drop of drops) {
        const [fx, fy] = fallOf(drop, wind);
        streak(g, drop.x, drop.y, fx, fy, drop.speed * streakSeconds, width * widen);
      }
      g.fill();
    }
  }
  g.globalAlpha = 1;
}

/** Each pass of a drop's streak: its width as a multiple of the depth's, and its share of the depth's alpha. */
const SHARP_PASS: readonly (readonly [widen: number, share: number])[] = [[1, 1]];
const SOFT_PASSES: readonly (readonly [widen: number, share: number])[] = [
  [2.6, 0.3],
  [1.6, 0.45],
  [0.8, 0.7],
];

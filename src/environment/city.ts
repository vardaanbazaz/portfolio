import type { ProjectPageId } from '../content/scene';
import { TRAFFIC_COUNT, TRAFFIC_SECONDS, TRAFFIC_SEED, WINDOW_PERIOD_SECONDS, WINDOW_SEED } from '../scene/tuning';
import { seeded } from '../visuals/seeded';

/**
 * The night city's details drawn by code over its painting, all in px of its 2048-wide image (`CITY_SIZE`): the
 * projects' names on their buildings' signs, the banner hanging from the second crane, the aviation lights, the far
 * windows that switch on and off, and the car lights on the avenue. Measured on the painting itself.
 */

export const CITY_SIZE = { width: 2048, height: 1750 } as const;

/** A point of the painting, in its px. */
export type CityPoint = readonly [x: number, y: number];

/** A sign surface's four corners, clockwise from the top left as the sign reads. */
export type Quad = readonly [topLeft: CityPoint, topRight: CityPoint, bottomRight: CityPoint, bottomLeft: CityPoint];

/** How a name is lettered on its sign. */
export type SignStyle = 'neon' | 'banner' | 'deco' | 'hanging' | 'led';

export interface Sign {
  page: ProjectPageId;
  style: SignStyle;
  /** The name, a line at a time. Joined by `joiner` they are its page title exactly. */
  lines: readonly string[];
  /** What goes between the lines in the name: a space where a line ends a word, nothing where it breaks one. */
  joiner: '' | ' ';
  /** Whether the name runs down the sign a letter at a time, upright, rather than across it. */
  vertical?: boolean;
  /** The size the sign is laid out at, in px, before it is fitted to its corners: about the surface's own size in
   *  the painting, so the letters keep their shapes. */
  size: { width: number; height: number };
  /** The surface's corners in the painting. A hanging banner has no painted surface; its corners are where it is
   *  drawn, square under the hook. */
  quad: Quad;
  /** The letters' size in px, at `size`. */
  fontPx: number;
}

/** Where the second crane's hook is: the hanging banner's two cables meet there, and it swings about it. */
export const CRANE_HOOK: CityPoint = [1442, 668];

/** The hanging banner's corners: under the hook, on two cables. */
const HANGING: Quad = [
  [1401, 690],
  [1483, 690],
  [1483, 764],
  [1401, 764],
];

export const SIGNS: readonly Sign[] = [
  {
    page: 'datavista',
    style: 'neon',
    lines: ['DataVista'],
    joiner: '',
    vertical: true,
    // The cyan blade on the glass tower's right side.
    quad: [
      [361, 352],
      [389, 358],
      [398, 776],
      [370, 776],
    ],
    size: { width: 30, height: 420 },
    fontPx: 22,
  },
  {
    page: 'kanbanlight',
    style: 'banner',
    lines: ['Kanban', 'Light'],
    joiner: '',
    // The pale banner on the scaffolding.
    quad: [
      [645, 842],
      [707, 841],
      [712, 1039],
      [654, 1044],
    ],
    size: { width: 62, height: 200 },
    fontPx: 14,
  },
  {
    page: 'attrition',
    style: 'deco',
    lines: ['Employee Attrition Analysis'],
    joiner: ' ',
    // The dark band where the lit crown meets the shaft.
    quad: [
      [910, 643],
      [1132, 643],
      [1134, 663],
      [908, 663],
    ],
    size: { width: 224, height: 20 },
    fontPx: 12,
  },
  {
    page: 'unified-api-ingester',
    style: 'hanging',
    lines: ['Unified', 'API', 'Ingester'],
    joiner: ' ',
    quad: HANGING,
    size: { width: 82, height: 74 },
    fontPx: 14,
  },
  {
    page: 'neuroinsight-ai',
    style: 'led',
    lines: ['Neuro', 'Insight-AI'],
    joiner: '',
    // A band across the violet face's middle, where its grid is evenly lit.
    quad: [
      [1604, 650],
      [1813, 650],
      [1811, 850],
      [1600, 850],
    ],
    size: { width: 210, height: 200 },
    fontPx: 38,
  },
];

/** How far past its corners a sign's surface takes presses, in px of the painting: its glowing rim and a little
 *  more, so a press on its edge counts. */
export const SIGN_HIT_PAD_PX = 6;

/** A convex polygon grown outward by `pad` px: each edge moved out along its normal, the corners where the moved edges
 *  meet. */
export function growPolygon(points: readonly CityPoint[], pad: number): CityPoint[] {
  const n = points.length;
  // Which way is out: the sign of the polygon's area (its corners' turning direction).
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % n];
    area += x0 * y1 - x1 * y0;
  }
  const out = area > 0 ? 1 : -1;
  const edge = (i: number) => {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % n];
    const length = Math.hypot(x1 - x0, y1 - y0);
    const nx = (out * (y1 - y0)) / length;
    const ny = (-out * (x1 - x0)) / length;
    return { x: x0 + nx * pad, y: y0 + ny * pad, dx: x1 - x0, dy: y1 - y0 };
  };
  return points.map((_, i) => {
    const a = edge((i + n - 1) % n);
    const b = edge(i);
    const det = a.dx * b.dy - a.dy * b.dx;
    const k = ((b.x - a.x) * b.dy - (b.y - a.y) * b.dx) / det;
    return [a.x + a.dx * k, a.y + a.dy * k] as const;
  });
}

/**
 * The surfaces that take presses for a project, besides its building's outline, in px of the painting: its sign
 * (grown by `SIGN_HIT_PAD_PX`), and for the hanging banner its two cables up to the hook too; for NeuroInsight-AI its
 * whole lit face as well as its lettering.
 */
export function signAreas(page: ProjectPageId): CityPoint[][] {
  const areas: CityPoint[][] = [];
  for (const sign of SIGNS.filter((s) => s.page === page)) {
    const [topLeft, topRight, bottomRight, bottomLeft] = growPolygon(sign.quad, SIGN_HIT_PAD_PX);
    // The cables run from the hook to the banner's top corners, so the hanging banner's area peaks at the hook.
    const [hookX, hookY] = CRANE_HOOK;
    areas.push(
      sign.style === 'hanging'
        ? [[hookX, hookY - SIGN_HIT_PAD_PX], topRight, bottomRight, bottomLeft, topLeft]
        : [topLeft, topRight, bottomRight, bottomLeft],
    );
    if (sign.style === 'led') areas.push([...LED_FACE]);
  }
  return areas;
}

/** The name a sign shows, its lines joined. */
export const signName = (sign: Pick<Sign, 'lines' | 'joiner'>) => sign.lines.join(sign.joiner);

/** The violet face's lit area, for its wave of light: its top edge cut along the chord of the face's rounded top
 *  right, so the wave never lights the sky or the frame there. */
export const LED_FACE: Quad = [
  [1612, 330],
  [1800, 410],
  [1798, 1215],
  [1592, 1215],
];

/** Red aviation lights: both cranes' tops, and the Art Deco spire and the violet tower's mast, each at its tip and
 *  again lower down, where a 16:9 view (which starts at row 108) shows it clear of the markers. */
export const BEACONS: readonly CityPoint[] = [
  [531, 505],
  [1363, 550],
  [1021, 181],
  [1021, 244],
  [1766, 97],
  [1766, 150],
];

/** Far windows that switch on and off: dark spots in the far buildings between the towers. Each one's size in px. */
export const WINDOW_SPOTS: readonly CityPoint[] = [
  [22, 792],
  [41, 868],
  [1172, 905],
  [1188, 962],
  [818, 934],
  [843, 1004],
  [1978, 776],
  [2008, 842],
];
export const WINDOW_SIZE = { width: 5, height: 6 } as const;

/** One far window: where, how long it holds each way, and where in that it starts (0 to 1). */
export interface CityWindow {
  at: CityPoint;
  period: number;
  phase: number;
}

export function cityWindows(seed: number = WINDOW_SEED): CityWindow[] {
  const next = seeded(seed);
  const [min, max] = WINDOW_PERIOD_SECONDS;
  return WINDOW_SPOTS.map((at) => ({ at, period: min + (max - min) * next(), phase: next() }));
}

/** The avenue right of the violet tower, from its far end to its near end. */
export const AVENUE: readonly [from: CityPoint, to: CityPoint] = [
  [1950, 1172],
  [1832, 1350],
];

/** One car's lights: which way it goes (toward the view shows headlights, away tail lights), the seconds it takes,
 *  and where along it starts (0 to 1). */
export interface Car {
  toward: boolean;
  seconds: number;
  phase: number;
}

export function cityTraffic(seed: number = TRAFFIC_SEED, count: number = TRAFFIC_COUNT): Car[] {
  const next = seeded(seed);
  const [min, max] = TRAFFIC_SECONDS;
  return Array.from({ length: count }, (_, i) => ({ toward: i % 2 === 0, seconds: min + (max - min) * next(), phase: next() }));
}

/**
 * The CSS `matrix3d` that maps a `width` by `height` box, from its top left corner, onto a quad: the perspective
 * transform that puts its corners on the quad's, in the quad's px.
 */
export function quadMatrix(width: number, height: number, quad: Quad): string {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad;
  // The square-to-quad projection (Heckbert), then scaled from the unit square to the box.
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / det;
  const h = (dx1 * sy - sx * dy1) / det;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + h * x3;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + h * y3;
  // Column-major, as matrix3d takes it; u = x / width, v = y / height.
  const m = [a / width, d / width, 0, g / width, b / height, e / height, 0, h / height, 0, 0, 1, 0, x0, y0, 0, 1];
  // To 12 significant digits: the perspective terms are small, and fixed decimals would round them off.
  return `matrix3d(${m.map((v) => Number(v.toPrecision(12))).join(', ')})`;
}

/** A quad moved by (-x, -y): in the px of a box whose top left is at (x, y). */
export function quadFrom(quad: Quad, [x, y]: CityPoint): Quad {
  const [a, b, c, d] = quad.map(([px, py]) => [px - x, py - y] as const);
  return [a, b, c, d];
}

/** Where `quadMatrix` puts a point of the box, for tests. */
export function quadPoint(width: number, height: number, quad: Quad, x: number, y: number): [number, number] {
  const match = /matrix3d\((.*)\)/.exec(quadMatrix(width, height, quad))!;
  const m = match[1].split(', ').map(Number);
  const X = m[0] * x + m[4] * y + m[12];
  const Y = m[1] * x + m[5] * y + m[13];
  const W = m[3] * x + m[7] * y + m[15];
  return [X / W, Y / W];
}

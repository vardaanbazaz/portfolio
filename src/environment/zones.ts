import { Color } from 'three';
import { SECTION_IDS, type SectionId } from '../sections/contract';
import { SECTION_T } from '../scene/cameraPath';
import type { Quality } from '../visuals/shared';

/** The path's zones: the landing view, then one per section. */
export type ZoneId = 'landing' | SectionId;

/** Zones in path order. */
export const ZONE_IDS: readonly ZoneId[] = ['landing', ...SECTION_IDS];

/** Each zone's own point on the path (t). Its preset applies fully there. */
export const ZONE_T: Record<ZoneId, number> = { landing: 0, ...SECTION_T };

/** The look of the environment at one zone. Colours are CSS hex strings. */
export interface ZonePreset {
  sky: { top: string; horizon: string };
  /** Linear fog, in world units from the camera, at quality 'high'. */
  fog: { color: string; near: number; far: number };
  ground: string;
  ambient: { color: string; intensity: number };
  sun: { color: string; intensity: number };
}

/** At quality 'low' the fog's near and far distances shrink by this factor. Colours and lights stay the same. */
export const LOW_FOG_SCALE = 2 / 3;

/** Grey-box tints: each zone a slightly different dark shade, so the blend between zones shows. */
export const ZONE_PRESETS: Record<ZoneId, ZonePreset> = {
  landing: {
    sky: { top: '#07080d', horizon: '#14161f' },
    fog: { color: '#14161f', near: 6, far: 45 },
    ground: '#121318',
    ambient: { color: '#c8ccd8', intensity: 0.55 },
    sun: { color: '#d8dcea', intensity: 1.1 },
  },
  about: {
    sky: { top: '#08070e', horizon: '#191523' },
    fog: { color: '#191523', near: 6, far: 45 },
    ground: '#15131a',
    ambient: { color: '#d0c8dc', intensity: 0.6 },
    sun: { color: '#e0d8ec', intensity: 1.2 },
  },
  projects: {
    sky: { top: '#060a0c', horizon: '#121c1f' },
    fog: { color: '#121c1f', near: 6, far: 45 },
    ground: '#111618',
    ambient: { color: '#c4d4d6', intensity: 0.6 },
    sun: { color: '#d4e4e6', intensity: 1.2 },
  },
  experience: {
    sky: { top: '#070a08', horizon: '#151d17' },
    fog: { color: '#151d17', near: 6, far: 42 },
    ground: '#131713',
    ambient: { color: '#ccd6cc', intensity: 0.6 },
    sun: { color: '#dce6d8', intensity: 1.15 },
  },
  publications: {
    sky: { top: '#0b0907', horizon: '#201a14' },
    fog: { color: '#201a14', near: 6, far: 42 },
    ground: '#181512',
    ambient: { color: '#dcd2c4', intensity: 0.6 },
    sun: { color: '#ecdcc8', intensity: 1.2 },
  },
  contact: {
    sky: { top: '#0b070a', horizon: '#1f1419' },
    fog: { color: '#1f1419', near: 6, far: 45 },
    ground: '#171215',
    ambient: { color: '#dcc8d2', intensity: 0.55 },
    sun: { color: '#ecd8e0', intensity: 1.1 },
  },
};

/** The environment at one path position: what `blendZones` writes each frame. */
export interface ZoneState {
  skyTop: Color;
  skyHorizon: Color;
  fogColor: Color;
  fogNear: number;
  fogFar: number;
  ground: Color;
  ambientColor: Color;
  ambientIntensity: number;
  sunColor: Color;
  sunIntensity: number;
}

export function createZoneState(): ZoneState {
  return {
    skyTop: new Color(),
    skyHorizon: new Color(),
    fogColor: new Color(),
    fogNear: 0,
    fogFar: 0,
    ground: new Color(),
    ambientColor: new Color(),
    ambientIntensity: 0,
    sunColor: new Color(),
    sunIntensity: 0,
  };
}

/** A preset with its colours parsed once, so blending allocates nothing. */
interface ParsedZone {
  id: ZoneId;
  t: number;
  skyTop: Color;
  skyHorizon: Color;
  fogColor: Color;
  fogNear: number;
  fogFar: number;
  ground: Color;
  ambientColor: Color;
  ambientIntensity: number;
  sunColor: Color;
  sunIntensity: number;
}

/** Zones parsed and sorted by path point, ready for `blendZones`. */
export type ZoneTable = readonly ParsedZone[];

export function parseZones(presets: Record<ZoneId, ZonePreset>, points: Record<ZoneId, number> = ZONE_T): ZoneTable {
  return ZONE_IDS.map((id) => {
    const { sky, fog, ground, ambient, sun } = presets[id];
    return {
      id,
      t: points[id],
      skyTop: new Color(sky.top),
      skyHorizon: new Color(sky.horizon),
      fogColor: new Color(fog.color),
      fogNear: fog.near,
      fogFar: fog.far,
      ground: new Color(ground),
      ambientColor: new Color(ambient.color),
      ambientIntensity: ambient.intensity,
      sunColor: new Color(sun.color),
      sunIntensity: sun.intensity,
    };
  }).sort((a, b) => a.t - b.t);
}

export const ZONES: ZoneTable = parseZones(ZONE_PRESETS);

const smoothstep = (x: number) => x * x * (3 - 2 * x);
const mix = (a: number, b: number, w: number) => a + (b - a) * w;

/** How much of a zone's preset applies at path position t: 1 at its own point, easing to 0 at each neighbour's
 *  point. Before the first zone and past the last, the end zone applies fully. The weights at any t sum to 1. */
export function zoneWeight(t: number, id: ZoneId, zones: ZoneTable = ZONES): number {
  let index = 0;
  while (index < zones.length - 1 && zones[index].id !== id) index++;
  const own = zones[index].t;
  const prev = index > 0 ? zones[index - 1].t : -Infinity;
  const next = index < zones.length - 1 ? zones[index + 1].t : Infinity;
  if (t <= prev || t >= next) return 0;
  if (t <= own) return index === 0 ? 1 : smoothstep((t - prev) / (own - prev));
  return index === zones.length - 1 ? 1 : smoothstep((next - t) / (next - own));
}

/** Writes the environment at path position t into `out` and returns it. A blend of the two zones either side of t,
 *  eased so each zone's preset holds near its own point. Allocates nothing. */
export function blendZones(t: number, quality: Quality, out: ZoneState, zones: ZoneTable = ZONES): ZoneState {
  let i = 0;
  while (i < zones.length - 2 && t >= zones[i + 1].t) i++;
  const a = zones[i];
  const b = zones[i + 1] ?? a;
  const span = b.t - a.t;
  const w = span > 0 ? smoothstep(Math.min(Math.max((t - a.t) / span, 0), 1)) : 0;
  const fogScale = quality === 'low' ? LOW_FOG_SCALE : 1;

  out.skyTop.lerpColors(a.skyTop, b.skyTop, w);
  out.skyHorizon.lerpColors(a.skyHorizon, b.skyHorizon, w);
  out.fogColor.lerpColors(a.fogColor, b.fogColor, w);
  out.fogNear = mix(a.fogNear, b.fogNear, w) * fogScale;
  out.fogFar = mix(a.fogFar, b.fogFar, w) * fogScale;
  out.ground.lerpColors(a.ground, b.ground, w);
  out.ambientColor.lerpColors(a.ambientColor, b.ambientColor, w);
  out.ambientIntensity = mix(a.ambientIntensity, b.ambientIntensity, w);
  out.sunColor.lerpColors(a.sunColor, b.sunColor, w);
  out.sunIntensity = mix(a.sunIntensity, b.sunIntensity, w);
  return out;
}

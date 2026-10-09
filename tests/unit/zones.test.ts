import { describe, expect, it } from 'vitest';
import { Color } from 'three';
import {
  blendZones,
  createZoneState,
  LOW_FOG_SCALE,
  parseZones,
  ZONE_IDS,
  ZONE_PRESETS,
  ZONE_T,
  ZONES,
  zoneWeight,
  type ZoneId,
  type ZonePreset,
  type ZoneState,
} from '../../src/environment/zones';
import { SECTION_IDS } from '../../src/sections/contract';
import { SECTION_T } from '../../src/scene/cameraPath';
import { CULL_DISTANCE } from '../../src/scene/tuning';

const hex = (c: Color) => `#${c.getHexString()}`;

function expectPreset(state: ZoneState, preset: ZonePreset, fogScale = 1) {
  expect(hex(state.skyTop)).toBe(preset.sky.top);
  expect(hex(state.skyHorizon)).toBe(preset.sky.horizon);
  expect(hex(state.fogColor)).toBe(preset.fog.color);
  expect(state.fogNear).toBeCloseTo(preset.fog.near * fogScale);
  expect(state.fogFar).toBeCloseTo(preset.fog.far * fogScale);
  expect(hex(state.ground)).toBe(preset.ground);
  expect(hex(state.ambientColor)).toBe(preset.ambient.color);
  expect(state.ambientIntensity).toBeCloseTo(preset.ambient.intensity);
  expect(hex(state.sunColor)).toBe(preset.sun.color);
  expect(state.sunIntensity).toBeCloseTo(preset.sun.intensity);
}

/** Two flat presets far apart, so a blend between them is easy to predict. */
const flat = (c: string, n: number): ZonePreset => ({
  sky: { top: c, horizon: c },
  fog: { color: c, near: n, far: n * 10 },
  ground: c,
  ambient: { color: c, intensity: n },
  sun: { color: c, intensity: n },
});
const TWO_POINTS = { landing: 0, about: 1, projects: 2, experience: 3, publications: 4, contact: 5 } as Record<ZoneId, number>;
const BLACK_TO_WHITE = parseZones(
  { ...ZONE_PRESETS, landing: flat('#000000', 0), about: flat('#ffffff', 1) },
  TWO_POINTS,
);

describe('zones', () => {
  it('are the landing view and then every section, in path order', () => {
    expect(ZONE_IDS).toEqual(['landing', ...SECTION_IDS]);
    expect(ZONE_T.landing).toBe(0);
    for (const id of SECTION_IDS) expect(ZONE_T[id]).toBe(SECTION_T[id]);
    expect(ZONES.map((z) => z.id)).toEqual(ZONE_IDS);
  });

  it('each have a different preset', () => {
    const horizons = new Set(ZONE_IDS.map((id) => ZONE_PRESETS[id].sky.horizon));
    expect(horizons.size).toBe(ZONE_IDS.length);
  });

  it("keep fog within the cull distance at both qualities, so a section is hidden by fog before it's culled", () => {
    for (const id of ZONE_IDS) {
      const { near, far } = ZONE_PRESETS[id].fog;
      expect(near, id).toBeLessThan(far);
      expect(far, id).toBeLessThanOrEqual(CULL_DISTANCE.high);
      expect(far * LOW_FOG_SCALE, id).toBeLessThanOrEqual(CULL_DISTANCE.low);
    }
  });
});

describe('blendZones', () => {
  it("applies a zone's preset fully at its own point", () => {
    const state = createZoneState();
    for (const id of ZONE_IDS) expectPreset(blendZones(ZONE_T[id], 'high', state), ZONE_PRESETS[id]);
  });

  it('holds the end presets before the first zone and past the last', () => {
    const state = createZoneState();
    expectPreset(blendZones(-0.5, 'high', state), ZONE_PRESETS.landing);
    expectPreset(blendZones(1, 'high', state), ZONE_PRESETS.contact);
    expectPreset(blendZones(1.5, 'high', state), ZONE_PRESETS.contact);
  });

  it('is an even mix halfway between neighbouring zones', () => {
    const state = blendZones(0.5, 'high', createZoneState(), BLACK_TO_WHITE);
    const mid = new Color('#000000').lerp(new Color('#ffffff'), 0.5);
    expect(state.skyTop.r).toBeCloseTo(mid.r);
    expect(state.fogColor.g).toBeCloseTo(mid.g);
    expect(state.fogNear).toBeCloseTo(0.5);
    expect(state.fogFar).toBeCloseTo(5);
    expect(state.sunIntensity).toBeCloseTo(0.5);
  });

  it('changes steadily from one zone to the next, holding near each point', () => {
    const state = createZoneState();
    const values = [0, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 1].map((t) => blendZones(t, 'high', state, BLACK_TO_WHITE).sunIntensity);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1]);
    // Eased: a step near a zone's point moves less than the same step in the middle.
    expect(values[1] - values[0]).toBeLessThan(values[5] - values[4]);
    expect(values[8] - values[7]).toBeLessThan(values[5] - values[4]);
  });

  it('keeps colours and lights at low quality and shortens the fog', () => {
    const state = createZoneState();
    for (const id of ZONE_IDS) expectPreset(blendZones(ZONE_T[id], 'low', state), ZONE_PRESETS[id], LOW_FOG_SCALE);
    expect(LOW_FOG_SCALE).toBeLessThan(1);
  });

  it('writes into the same objects every call', () => {
    const state = createZoneState();
    const colours = () => [state.skyTop, state.skyHorizon, state.fogColor, state.ground, state.ambientColor, state.sunColor];
    const before = colours();
    for (const t of [0, 0.13, 0.5, 0.88, 1]) expect(blendZones(t, 'high', state)).toBe(state);
    colours().forEach((c, i) => expect(c).toBe(before[i]));
  });
});

describe('zoneWeight', () => {
  it('is 1 at its own point and 0 at its neighbours', () => {
    ZONE_IDS.forEach((id, i) => {
      expect(zoneWeight(ZONE_T[id], id)).toBe(1);
      if (i > 0) expect(zoneWeight(ZONE_T[ZONE_IDS[i - 1]], id)).toBe(0);
      if (i < ZONE_IDS.length - 1) expect(zoneWeight(ZONE_T[ZONE_IDS[i + 1]], id)).toBe(0);
    });
  });

  it('sums to 1 over all zones anywhere on the path', () => {
    for (let t = -0.1; t <= 1.1; t += 0.01) {
      const sum = ZONE_IDS.reduce((s, id) => s + zoneWeight(t, id), 0);
      expect(sum, `t=${t}`).toBeCloseTo(1);
    }
  });

  it('matches the blend: the share of the next zone is what blendZones mixes in', () => {
    const state = createZoneState();
    for (const t of [0.1, 0.3, 0.45]) {
      blendZones(t, 'high', state, BLACK_TO_WHITE);
      expect(state.sunIntensity).toBeCloseTo(zoneWeight(t, 'about', BLACK_TO_WHITE));
    }
  });
});

import { describe, expect, it } from 'vitest';
import {
  ambientLevel,
  BACKDROP_MIN_WEIGHT,
  backdropWeight,
  BACKDROPS,
  layerOpacities,
  shouldPlay,
  worldOpacity,
  type ZoneBackdrop,
} from '../../src/environment/backdrops';
import { ZONE_IDS, ZONE_T, zoneWeight } from '../../src/environment/zones';
import { AMBIENT_GAIN, SWEEP_PEAK_GAIN } from '../../src/scene/tuning';

const backdrop = (zone: ZoneBackdrop['zone']): ZoneBackdrop => ({ zone, video: `${zone}.mp4`, poster: `${zone}.webp` });

describe('the backdrop registry', () => {
  it('has at most one backdrop per zone', () => {
    const zones = BACKDROPS.map((b) => b.zone);
    expect(new Set(zones).size).toBe(zones.length);
  });

  it('starts with the landing world', () => {
    expect(BACKDROPS.map((b) => b.zone)).toEqual(['landing']);
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
});

describe('layerOpacities', () => {
  /** What each video and the dome add to the final picture: layers composited in order, the dome over them. */
  function contributions(weights: number[], dome: number) {
    const opacities = layerOpacities(weights);
    const videos = weights.map(() => 0);
    let background = 1;
    opacities.forEach((a, i) => {
      for (let j = 0; j < i; j++) videos[j] *= 1 - a;
      background *= 1 - a;
      videos[i] = a;
    });
    return { videos: videos.map((v) => v * (1 - dome)), background: background * (1 - dome), dome };
  }

  it('shows one backdrop fully wherever it has weight, so the dome alone carries the fade', () => {
    expect(layerOpacities([1])).toEqual([1]);
    expect(layerOpacities([0.3])).toEqual([1]);
    expect(layerOpacities([0])).toEqual([0]);
  });

  it('shows the video at exactly its weight between the landing and About, with no page background showing', () => {
    const landing = [backdrop('landing')];
    for (let i = 0; i <= 20; i++) {
      const t = (ZONE_T.about * i) / 20;
      const weight = backdropWeight(t, 'landing');
      const { videos, background, dome } = contributions([weight], worldOpacity(t, landing));
      expect(videos[0]).toBeCloseTo(weight);
      expect(dome).toBeCloseTo(1 - weight);
      expect(background).toBeCloseTo(weight > 0 ? 0 : 1 - dome);
    }
  });

  it('mixes neighbouring backdrops by their weights', () => {
    const { videos, background, dome } = contributions([0.25, 0.5], 0.25);
    expect(videos[0]).toBeCloseTo(0.25);
    expect(videos[1]).toBeCloseTo(0.5);
    expect(dome + background + videos[0] + videos[1]).toBeCloseTo(1);
    expect(background).toBeCloseTo(0);
  });
});

describe('shouldPlay', () => {
  it('plays only with weight, no page open, a visible tab and no Save-Data', () => {
    expect(shouldPlay(1, false, false, false)).toBe(true);
    expect(shouldPlay(0.01, false, false, false)).toBe(true);
    expect(shouldPlay(0, false, false, false)).toBe(false);
    expect(shouldPlay(1, true, false, false)).toBe(false);
    expect(shouldPlay(1, false, true, false)).toBe(false);
    expect(shouldPlay(1, false, false, true)).toBe(false);
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

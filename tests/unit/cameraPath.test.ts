import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  cameraCurve,
  dampTowards,
  fovForAspect,
  lookPos,
  pathPos,
  scrollProgress,
  STOP_T,
  stopGroundPoint,
  stopProximity,
} from '../../src/scene/cameraPath';
import { STOP_IDS } from '../../src/stops/contract';
import { stopCentreHeights } from '../../src/scene/layout';
import { BASE_FOV, MAX_FOV, STOP_PROXIMITY_RADIUS } from '../../src/scene/tuning';

describe('scrollProgress', () => {
  it('maps scroll offset to 0..1 and clamps', () => {
    expect(scrollProgress(0, 1000)).toBe(0);
    expect(scrollProgress(500, 1000)).toBe(0.5);
    expect(scrollProgress(1000, 1000)).toBe(1);
    expect(scrollProgress(-40, 1000)).toBe(0); // iOS rubber-band overscroll
    expect(scrollProgress(1100, 1000)).toBe(1);
  });

  it('returns 0 when the page cannot scroll', () => {
    expect(scrollProgress(0, 0)).toBe(0);
  });
});

describe('dampTowards', () => {
  it('closes about 98% of the gap in one second at lambda 4', () => {
    const t = dampTowards(0, 1, 4, 1);
    expect(t).toBeGreaterThan(0.98);
    expect(t).toBeLessThan(0.99);
  });

  it('does not track 1:1 within a single frame', () => {
    expect(dampTowards(0, 1, 4, 1 / 60)).toBeLessThan(0.1);
  });

  it('is frame-rate independent', () => {
    const run = (fps: number) => {
      let t = 0;
      for (let i = 0; i < fps; i++) t = dampTowards(t, 1, 4, 1 / fps);
      return t;
    };
    expect(run(30)).toBeCloseTo(run(120), 10);
  });

  it('snaps to the target when lambda is Infinity', () => {
    expect(dampTowards(0.2, 0.7, Infinity, 1 / 60)).toBe(0.7);
  });
});

describe('path', () => {
  it('starts and ends at the first and last control points', () => {
    expect(pathPos(0).distanceTo(cameraCurve.points[0])).toBeCloseTo(0, 6);
    expect(pathPos(1).distanceTo(cameraCurve.points.at(-1)!)).toBeCloseTo(0, 6);
  });

  it('clamps t outside 0..1', () => {
    expect(pathPos(-1).equals(pathPos(0))).toBe(true);
    expect(pathPos(2).equals(pathPos(1))).toBe(true);
  });

  it('orders stops along the path after the intro stretch', () => {
    const ts = STOP_IDS.map((id) => STOP_T[id]);
    expect(ts[0]).toBeGreaterThan(0.1);
    for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThan(ts[i - 1]);
    expect(ts.at(-1)!).toBeLessThan(1);
  });

  it('keeps every stop clear of the camera path', () => {
    for (const id of STOP_IDS) {
      const ground = stopGroundPoint(id);
      for (let i = 0; i <= 200; i++) {
        const p = pathPos(i / 200);
        const flat = new Vector3(p.x, 0, p.z);
        expect(flat.distanceTo(ground)).toBeGreaterThan(2.5);
      }
    }
  });

  it('produces finite look targets across the whole path, including past the end', () => {
    for (let i = 0; i <= 100; i++) {
      const l = lookPos(i / 100, stopCentreHeights);
      expect(Number.isFinite(l.x) && Number.isFinite(l.y) && Number.isFinite(l.z)).toBe(true);
    }
  });

  it('turns the camera toward a stop when it is at the stop', () => {
    for (const id of STOP_IDS) {
      const t = STOP_T[id];
      const cam = pathPos(t);
      const toLook = lookPos(t, stopCentreHeights).sub(cam).normalize();
      const toStop = stopGroundPoint(id).setY(stopCentreHeights[id]).sub(cam).normalize();
      expect(toLook.dot(toStop)).toBeGreaterThan(0.95);
    }
  });
});

describe('stopProximity', () => {
  it('is 1 at the stop and 0 at or beyond the radius', () => {
    expect(stopProximity(0.5, 0.5)).toBe(1);
    expect(stopProximity(0.5 + STOP_PROXIMITY_RADIUS, 0.5)).toBe(0);
    expect(stopProximity(0.9, 0.5)).toBe(0);
  });

  it('is symmetric and falls off monotonically', () => {
    const r = STOP_PROXIMITY_RADIUS;
    expect(stopProximity(0.5 - r / 3, 0.5)).toBeCloseTo(stopProximity(0.5 + r / 3, 0.5), 12);
    expect(stopProximity(0.5 + r / 4, 0.5)).toBeGreaterThan(stopProximity(0.5 + r / 2, 0.5));
  });

  it('never overlaps between neighbouring stops', () => {
    for (let i = 0; i <= 1000; i++) {
      const t = i / 1000;
      const active = STOP_IDS.filter((id) => stopProximity(t, STOP_T[id]) > 0);
      expect(active.length).toBeLessThanOrEqual(1);
    }
  });
});

describe('fovForAspect', () => {
  it('keeps the base FOV on landscape screens', () => {
    expect(fovForAspect(16 / 9)).toBe(BASE_FOV);
    expect(fovForAspect(1)).toBe(BASE_FOV);
  });

  it('widens on portrait screens, up to the cap', () => {
    expect(fovForAspect(0.8)).toBeGreaterThan(BASE_FOV);
    expect(fovForAspect(390 / 844)).toBeLessThanOrEqual(MAX_FOV);
  });
});

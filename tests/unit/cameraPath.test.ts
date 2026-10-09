import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  cameraCurve,
  dampTowards,
  fovForAspect,
  lookPos,
  pathPos,
  scrollProgress,
  SECTION_T,
  sectionGroundPoint,
  sectionProximity,
} from '../../src/scene/cameraPath';
import { SECTION_IDS } from '../../src/sections/contract';
import { sectionCentreHeights, sectionToWorld } from '../../src/scene/layout';
import { sectionLayouts } from '../../src/sections/layouts';
import { BASE_FOV, MAX_FOV, SECTION_PROXIMITY_RADIUS } from '../../src/scene/tuning';

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

  it('orders sections along the path after the landing stretch', () => {
    const ts = SECTION_IDS.map((id) => SECTION_T[id]);
    expect(ts[0]).toBeGreaterThan(0.1);
    for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThan(ts[i - 1]);
    expect(ts.at(-1)!).toBeLessThan(1);
  });

  it("keeps every section's ground point clear of the camera path", () => {
    for (const id of SECTION_IDS) {
      const ground = sectionGroundPoint(id);
      for (let i = 0; i <= 200; i++) {
        const p = pathPos(i / 200);
        const flat = new Vector3(p.x, 0, p.z);
        expect(flat.distanceTo(ground)).toBeGreaterThan(2.5);
      }
    }
  });

  it("keeps every section's bounding box clear of the camera path", () => {
    for (const id of SECTION_IDS) {
      const [hx, , hz] = sectionLayouts[id].bounds;
      const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => sectionToWorld(id, [sx * hx, 0, sz * hz]).setY(0)));
      for (let i = 0; i <= 200; i++) {
        const p = pathPos(i / 200);
        const flat = new Vector3(p.x, 0, p.z);
        for (const c of corners) expect(flat.distanceTo(c)).toBeGreaterThan(1);
      }
    }
  });

  it('produces finite look targets across the whole path, including past the end', () => {
    for (let i = 0; i <= 100; i++) {
      const l = lookPos(i / 100, sectionCentreHeights);
      expect(Number.isFinite(l.x) && Number.isFinite(l.y) && Number.isFinite(l.z)).toBe(true);
    }
  });

  it('turns the camera toward a section when it is at the section', () => {
    for (const id of SECTION_IDS) {
      const t = SECTION_T[id];
      const cam = pathPos(t);
      const toLook = lookPos(t, sectionCentreHeights).sub(cam).normalize();
      const toStop = sectionGroundPoint(id).setY(sectionCentreHeights[id]).sub(cam).normalize();
      expect(toLook.dot(toStop)).toBeGreaterThan(0.95);
    }
  });
});

describe('sectionProximity', () => {
  it('is 1 at the section and 0 at or beyond the radius', () => {
    expect(sectionProximity(0.5, 0.5)).toBe(1);
    expect(sectionProximity(0.5 + SECTION_PROXIMITY_RADIUS, 0.5)).toBeCloseTo(0, 12);
    expect(sectionProximity(0.9, 0.5)).toBe(0);
  });

  it('is symmetric and falls off monotonically', () => {
    const r = SECTION_PROXIMITY_RADIUS;
    expect(sectionProximity(0.5 - r / 3, 0.5)).toBeCloseTo(sectionProximity(0.5 + r / 3, 0.5), 12);
    expect(sectionProximity(0.5 + r / 4, 0.5)).toBeGreaterThan(sectionProximity(0.5 + r / 2, 0.5));
  });

  it('never overlaps between neighbouring sections', () => {
    for (let i = 0; i <= 1000; i++) {
      const t = i / 1000;
      const active = SECTION_IDS.filter((id) => sectionProximity(t, SECTION_T[id]) > 0);
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

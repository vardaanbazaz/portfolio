import { describe, expect, it } from 'vitest';
import { PAGE_LABELS, SECTION_LINES, SECTION_TITLES } from '../../src/content/scene';
import { PAGE_IDS } from '../../src/pages/contract';
import { Vector3 } from 'three';
import { landingOpacity, pathPos, SECTION_T } from '../../src/scene/cameraPath';
import { sectionInRange } from '../../src/scene/culling';
import { nearestMarkerIndex, sectionLayout } from '../../src/scene/layout';
import { CULL_DISTANCE, LANDING_FADE_T } from '../../src/scene/tuning';
import { SECTION_IDS, type SectionId } from '../../src/sections/contract';
import { markerFor, PAGE_SECTION, sectionLayouts } from '../../src/sections/layouts';

describe('section layouts', () => {
  it('gives every page exactly one marker, in one section', () => {
    const pages = SECTION_IDS.flatMap((s) => sectionLayouts[s].markers.map((m) => m.page));
    expect([...pages].sort()).toEqual([...PAGE_IDS].sort());
    for (const page of PAGE_IDS) expect(sectionLayouts[PAGE_SECTION[page]].markers).toContain(markerFor(page));
  });

  it('puts the five projects in the Projects section and one marker in each other section', () => {
    expect(sectionLayouts.projects.markers.map((m) => m.page)).toEqual([
      'datavista',
      'neuroinsight-ai',
      'attrition',
      'kanbanlight',
      'unified-api-ingester',
    ]);
    for (const id of SECTION_IDS.filter((s) => s !== 'projects')) {
      expect(sectionLayouts[id].markers.map((m) => m.page)).toEqual([id]);
    }
  });

  it('keeps every marker box inside its section bounds and standing on the floor', () => {
    for (const id of SECTION_IDS) {
      const { bounds, markers } = sectionLayouts[id];
      for (const { box } of markers) {
        for (let axis = 0; axis < 3; axis++) {
          expect(Math.abs(box.centre[axis]) + box.half[axis]).toBeLessThanOrEqual(bounds[axis] + 1e-9);
        }
        expect(box.centre[1] - box.half[1]).toBeCloseTo(-bounds[1], 9);
      }
    }
  });

  it('keeps marker boxes in a section apart', () => {
    for (const id of SECTION_IDS) {
      const boxes = sectionLayouts[id].markers.map((m) => m.box);
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const gap = Math.abs(boxes[i].centre[0] - boxes[j].centre[0]) - boxes[i].half[0] - boxes[j].half[0];
          expect(gap).toBeGreaterThan(0);
        }
      }
    }
  });

  it('has a title, a one-liner slot and page labels for everything', () => {
    for (const id of SECTION_IDS) {
      expect(SECTION_TITLES[id]).toBeTruthy();
      expect(SECTION_LINES[id]).toBeTruthy();
    }
    for (const page of PAGE_IDS) expect(PAGE_LABELS[page]).toBeTruthy();
  });
});

describe('nearestMarkerIndex', () => {
  it('picks the box under a point in the Projects row', () => {
    const boxes = sectionLayouts.projects.markers.map((m) => m.box);
    boxes.forEach(({ centre }, i) => expect(nearestMarkerIndex(boxes, centre[0], centre[2])).toBe(i));
    expect(nearestMarkerIndex(boxes, -100, 0)).toBe(0);
    expect(nearestMarkerIndex(boxes, 100, 0)).toBe(boxes.length - 1);
  });
});

describe('culling', () => {
  it('draws a section until its nearest side is past the cull distance', () => {
    for (const quality of ['high', 'low'] as const) {
      const far = CULL_DISTANCE[quality];
      expect(sectionInRange(far + 1, 1, quality)).toBe(true);
      expect(sectionInRange(far + 1.01, 1, quality)).toBe(false);
      expect(sectionInRange(0, 1, quality)).toBe(true);
    }
  });

  it('culls nearer at low quality', () => {
    expect(CULL_DISTANCE.low).toBeLessThan(CULL_DISTANCE.high);
    expect(sectionInRange(CULL_DISTANCE.low + 5, 0, 'low')).toBe(false);
    expect(sectionInRange(CULL_DISTANCE.low + 5, 0, 'high')).toBe(true);
  });
});

describe('culling along the path', () => {
  const drawn = (t: number, quality: 'high' | 'low') =>
    SECTION_IDS.filter((id: SectionId) => {
      const b = sectionLayouts[id].bounds;
      const centre = new Vector3(sectionLayout[id].ground[0], b[1], sectionLayout[id].ground[2]);
      return sectionInRange(pathPos(t).distanceTo(centre), Math.hypot(...b), quality);
    });

  it('always draws the section the camera is at', () => {
    for (const quality of ['high', 'low'] as const) {
      for (const id of SECTION_IDS) expect(drawn(SECTION_T[id], quality)).toContain(id);
    }
  });

  it('skips the last section from the landing view at both qualities, and more at low quality', () => {
    expect(drawn(0, 'high')).not.toContain('contact');
    expect(drawn(0, 'low')).not.toContain('contact');
    expect(drawn(0, 'low')).not.toContain('publications');
    expect(drawn(1, 'low')).not.toContain('about');
  });
});

describe('landingOpacity', () => {
  it('is 1 at the start and 0 from the fade point on', () => {
    expect(landingOpacity(0)).toBe(1);
    expect(landingOpacity(LANDING_FADE_T)).toBe(0);
    expect(landingOpacity(0.5)).toBe(0);
    expect(landingOpacity(LANDING_FADE_T / 2)).toBeCloseTo(0.5, 9);
  });
});

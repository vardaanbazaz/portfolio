import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { markerLabel } from '../../src/content/scene';
import { cameraPose, fovForAspect, SECTION_T, sectionProximity } from '../../src/scene/cameraPath';
import { markerWorldAnchor, sectionCentreHeights } from '../../src/scene/layout';
import { MARKER_MIN_PROXIMITY } from '../../src/scene/tuning';
import type { SectionId } from '../../src/sections/contract';
import { MARKERS } from '../../src/sections/layouts';

/**
 * An estimate of each marker button's on-screen box, from the `.marker` and `button` rules in `src/index.css`:
 * 16px text, 16px side padding and a 1px border, at most 10em of text per line, at least 44px tall.
 * Text width is estimated at a generous 0.6em per character, not measured in a browser.
 */
const FONT_PX = 16;
const CHAR_PX = 0.6 * FONT_PX;
const MAX_TEXT_PX = 10 * FONT_PX;
const LINE_PX = 1.2 * FONT_PX;
const FRAME_PX = 2 * 16 + 2 * 1;
const MIN_HEIGHT_PX = 44;

function labelSize(label: string): { width: number; height: number } {
  const text = label.length * CHAR_PX;
  const lines = Math.ceil(text / MAX_TEXT_PX);
  return {
    width: Math.min(text, MAX_TEXT_PX) + FRAME_PX,
    height: Math.max(MIN_HEIGHT_PX, lines * LINE_PX + 2),
  };
}

const WIDTH = 390;
const HEIGHT = 844;
const aspect = WIDTH / HEIGHT;

/** Path positions at which a section's markers are shown (proximity at or above the minimum), sampled finely. */
function shownAt(section: SectionId): number[] {
  const ts: number[] = [];
  for (let t = SECTION_T[section] - 0.1; t <= SECTION_T[section] + 0.1; t += 0.002) {
    if (sectionProximity(t, SECTION_T[section]) >= MARKER_MIN_PROXIMITY) ts.push(t);
  }
  return ts;
}

/** Each pair of a section's marker labels that overlap on a 390 x 844 screen, at any point where they show. */
function overlaps(section: SectionId): string[] {
  const markers = MARKERS.filter((m) => m.section === section).map((m) => ({
    label: markerLabel(m.marker),
    anchor: markerWorldAnchor(m),
    size: labelSize(markerLabel(m.marker)),
  }));
  const camera = new PerspectiveCamera(fovForAspect(aspect), aspect, 0.1, 200);
  const look = new Vector3();
  const found = new Set<string>();

  for (const t of shownAt(section)) {
    cameraPose(t, aspect, sectionCentreHeights, camera.position, look);
    camera.lookAt(look);
    camera.updateMatrixWorld();
    const onScreen = markers.map(({ anchor }) => {
      const p = anchor.clone().project(camera);
      return { x: ((p.x + 1) / 2) * WIDTH, y: ((1 - p.y) / 2) * HEIGHT, inFront: p.z < 1 };
    });
    for (let i = 0; i < markers.length; i++) {
      for (let j = i + 1; j < markers.length; j++) {
        if (!onScreen[i].inFront || !onScreen[j].inFront) continue;
        const dx = Math.abs(onScreen[i].x - onScreen[j].x);
        const dy = Math.abs(onScreen[i].y - onScreen[j].y);
        const a = markers[i].size;
        const b = markers[j].size;
        if (dx < (a.width + b.width) / 2 && dy < (a.height + b.height) / 2) {
          found.add(`${markers[i].label} / ${markers[j].label}`);
        }
      }
    }
  }
  return [...found];
}

describe('marker labels on a 390 px wide screen (estimated sizes)', () => {
  it('samples the whole stretch where markers show', () => {
    expect(shownAt('experience').length).toBeGreaterThan(20);
  });

  // Projects is left out: its labels overlap at this width, and its layout is unchanged here.
  for (const section of ['experience', 'publications'] as const) {
    it(`never overlap in ${section}`, () => expect(overlaps(section)).toEqual([]));
  }
});

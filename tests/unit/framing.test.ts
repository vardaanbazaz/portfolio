import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { opensPanel, PAGE_IDS, PAGE_ITEMS } from '../../src/pages/contract';
import { cameraPose, fovForAspect, SECTION_T } from '../../src/scene/cameraPath';
import { inspectBox, inspectPose, sectionCentreHeights, sectionToWorld, type Framing } from '../../src/scene/layout';
import { SECTION_IDS, type LocalBox, type MarkerTarget, type SectionId } from '../../src/sections/contract';
import { MARKERS, PAGE_SECTION, sectionLayouts } from '../../src/sections/layouts';

const ASPECTS = { desktop: 16 / 9, phone: 390 / 844 };

/** Screen region (normalised device coordinates) a box must stay inside: the whole frame less a margin by default. */
interface Region {
  x: [min: number, max: number];
  y: [min: number, max: number];
}

const WHOLE: Region = { x: [-0.9, 0.9], y: [-0.9, 0.9] };

function expectBoxInFrame(camera: PerspectiveCamera, section: SectionId, { centre, half }: LocalBox, region = WHOLE) {
  camera.updateMatrixWorld();
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const corner = sectionToWorld(section, [
      centre[0] + sx * half[0],
      centre[1] + sy * half[1],
      centre[2] + sz * half[2],
    ]).project(camera);
    expect(corner.x, `x of corner ${sx},${sy},${sz}`).toBeGreaterThanOrEqual(region.x[0]);
    expect(corner.x, `x of corner ${sx},${sy},${sz}`).toBeLessThanOrEqual(region.x[1]);
    expect(corner.y, `y of corner ${sx},${sy},${sz}`).toBeGreaterThanOrEqual(region.y[0]);
    expect(corner.y, `y of corner ${sx},${sy},${sz}`).toBeLessThanOrEqual(region.y[1]);
    expect(corner.z, 'in front of the camera').toBeLessThan(1);
  }
}

describe('each whole section fits in frame when the camera is at it', () => {
  for (const [name, aspect] of Object.entries(ASPECTS)) {
    for (const id of SECTION_IDS) {
      it(`${id} on ${name}`, () => {
        const camera = new PerspectiveCamera(fovForAspect(aspect), aspect, 0.1, 200);
        const look = new Vector3();
        cameraPose(SECTION_T[id], aspect, sectionCentreHeights, camera.position, look);
        camera.lookAt(look);
        expectBoxInFrame(camera, id, { centre: [0, 0, 0], half: sectionLayouts[id].bounds });
      });
    }
  }
});

function expectFramedAtInspectPose(
  target: MarkerTarget,
  aspect: number,
  section: SectionId,
  box: LocalBox,
  framing: Framing = 'whole',
  region = WHOLE,
) {
  const camera = new PerspectiveCamera(fovForAspect(aspect), aspect, 0.1, 200);
  const look = new Vector3();
  inspectPose(target, aspect, camera.position, look, framing);
  camera.lookAt(look);
  expectBoxInFrame(camera, section, box, region);
  // Above the floor.
  expect(camera.position.y).toBeGreaterThan(0);
}

const pageMarkers = MARKERS.filter(({ marker }) => !opensPanel(marker.item));
const panelMarkers = MARKERS.filter(({ marker }) => opensPanel(marker.item));

describe("each page marker's box fits in frame at its inspect pose", () => {
  for (const [name, aspect] of Object.entries(ASPECTS)) {
    for (const { key, section, marker } of pageMarkers) {
      it(`${key} on ${name}`, () => expectFramedAtInspectPose(marker, aspect, section, marker.box));
    }
  }
});

/** The half of the screen the box gets beside its panel, less a margin; the panel takes the other half. */
const PANEL_REGIONS: Record<Exclude<Framing, 'whole'>, Region> = {
  side: { x: [-0.95, -0.05], y: [-0.9, 0.9] },
  stacked: { x: [-0.9, 0.9], y: [0.05, 0.95] },
};

describe("each panel marker's box fits in its half of the frame beside the panel", () => {
  it('applies to DRDO, AgryBin and Web Page Linker', () =>
    expect(panelMarkers.map((m) => m.key)).toEqual(['drdo', 'agrybin', 'web-page-linker']));

  // Stacked comes from the viewport width, not the aspect, so a short landscape window can be stacked too.
  const cases = [
    ['side', 'desktop', ASPECTS.desktop],
    ['stacked', 'phone', ASPECTS.phone],
    ['stacked', 'narrow landscape', 700 / 400],
  ] as const;
  for (const [framing, name, aspect] of cases) {
    for (const { key, section, marker } of panelMarkers) {
      it(`${key}, ${framing}, on ${name}`, () =>
        expectFramedAtInspectPose(marker, aspect, section, marker.box, framing, PANEL_REGIONS[framing]));
    }
  }
});

describe('a page with items, opened without one (by its URL), frames its whole section', () => {
  const pages = PAGE_IDS.filter((page) => PAGE_ITEMS[page]);

  it('applies to Experience and Publications', () => expect(pages).toEqual(['experience', 'publications']));

  for (const [name, aspect] of Object.entries(ASPECTS)) {
    for (const page of pages) {
      it(`${page} on ${name}`, () => {
        const section = PAGE_SECTION[page];
        expect(inspectBox({ page })).toEqual({ section, box: { centre: [0, 0, 0], half: sectionLayouts[section].bounds } });
        expectFramedAtInspectPose({ page }, aspect, section, { centre: [0, 0, 0], half: sectionLayouts[section].bounds });
      });
    }
  }
});

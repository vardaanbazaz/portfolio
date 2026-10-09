import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { PAGE_IDS } from '../../src/pages/contract';
import { cameraPose, fovForAspect, SECTION_T } from '../../src/scene/cameraPath';
import { inspectPose, sectionCentreHeights, sectionToWorld } from '../../src/scene/layout';
import { SECTION_IDS, type LocalBox, type SectionId } from '../../src/sections/contract';
import { markerFor, PAGE_SECTION, sectionLayouts } from '../../src/sections/layouts';

const ASPECTS = { desktop: 16 / 9, phone: 390 / 844 };

function expectBoxInFrame(camera: PerspectiveCamera, section: SectionId, { centre, half }: LocalBox) {
  camera.updateMatrixWorld();
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const corner = sectionToWorld(section, [
      centre[0] + sx * half[0],
      centre[1] + sy * half[1],
      centre[2] + sz * half[2],
    ]).project(camera);
    expect(Math.abs(corner.x), `x of corner ${sx},${sy},${sz}`).toBeLessThanOrEqual(0.9);
    expect(Math.abs(corner.y), `y of corner ${sx},${sy},${sz}`).toBeLessThanOrEqual(0.9);
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

describe("each page's box fits in frame at its inspect pose", () => {
  for (const [name, aspect] of Object.entries(ASPECTS)) {
    for (const page of PAGE_IDS) {
      it(`${page} on ${name}`, () => {
        const camera = new PerspectiveCamera(fovForAspect(aspect), aspect, 0.1, 200);
        const look = new Vector3();
        inspectPose(page, aspect, camera.position, look);
        camera.lookAt(look);
        expectBoxInFrame(camera, PAGE_SECTION[page], markerFor(page).box);
        // Above the floor.
        expect(camera.position.y).toBeGreaterThan(0);
      });
    }
  }
});

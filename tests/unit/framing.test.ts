import { describe, expect, it } from 'vitest';
import { Euler, PerspectiveCamera, Vector3 } from 'three';
import { cameraPose, fovForAspect, STOP_T } from '../../src/scene/cameraPath';
import { inspectPose, stopCentreHeights, stopLayout } from '../../src/scene/layout';
import { stopBounds } from '../../src/stops/bounds';
import { STOP_IDS } from '../../src/stops/contract';

const ASPECTS = { desktop: 16 / 9, phone: 390 / 844 };

describe('each stop fits in frame when the camera is at it', () => {
  for (const [name, aspect] of Object.entries(ASPECTS)) {
    for (const id of STOP_IDS) {
      it(`${id} on ${name}`, () => {
        const camera = new PerspectiveCamera(fovForAspect(aspect), aspect, 0.1, 200);
        const look = new Vector3();
        cameraPose(STOP_T[id], aspect, stopCentreHeights, camera.position, look);
        camera.lookAt(look);
        camera.updateMatrixWorld();

        const [hx, hy, hz] = stopBounds[id];
        const { ground, rotationY } = stopLayout[id];
        const rotation = new Euler(0, rotationY, 0);
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
          const corner = new Vector3(sx * hx, sy * hy + hy, sz * hz)
            .applyEuler(rotation)
            .add(new Vector3(...ground))
            .project(camera);
          expect(Math.abs(corner.x), `x of corner ${sx},${sy},${sz}`).toBeLessThanOrEqual(0.9);
          expect(Math.abs(corner.y), `y of corner ${sx},${sy},${sz}`).toBeLessThanOrEqual(0.9);
        }
      });
    }
  }
});

describe('each stop fits in frame at its inspect pose', () => {
  for (const [name, aspect] of Object.entries(ASPECTS)) {
    for (const id of STOP_IDS) {
      it(`${id} on ${name}`, () => {
        const camera = new PerspectiveCamera(fovForAspect(aspect), aspect, 0.1, 200);
        const look = new Vector3();
        inspectPose(id, aspect, camera.position, look);
        camera.lookAt(look);
        camera.updateMatrixWorld();

        const [hx, hy, hz] = stopBounds[id];
        const { ground, rotationY } = stopLayout[id];
        const rotation = new Euler(0, rotationY, 0);
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
          const corner = new Vector3(sx * hx, sy * hy + hy, sz * hz)
            .applyEuler(rotation)
            .add(new Vector3(...ground))
            .project(camera);
          expect(Math.abs(corner.x), `x of corner ${sx},${sy},${sz}`).toBeLessThanOrEqual(0.9);
          expect(Math.abs(corner.y), `y of corner ${sx},${sy},${sz}`).toBeLessThanOrEqual(0.9);
          expect(corner.z, 'in front of the camera').toBeLessThan(1);
        }
        // Above the floor, and on the path side of the stop.
        expect(camera.position.y).toBeGreaterThan(0);
      });
    }
  }
});

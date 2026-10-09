import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Euler, Vector3 } from 'three';
import { STOP_IDS, type StopId } from '../stops/contract';
import { stopVisuals } from '../stops/registry';
import type { FrameState } from './frameState';
import { stopLayout } from './layout';
import { getMarker } from './markerRegistry';
import { MARKER_MIN_PROXIMITY } from './tuning';

const projected = new Vector3();

/** World point of each stop's marker anchor (the visual's local anchor, lifted and placed like the visual). */
function markerWorldAnchors(): Record<StopId, Vector3> {
  return Object.fromEntries(
    STOP_IDS.map((id) => {
      const { bounds, markerAnchor } = stopVisuals[id];
      const { ground, rotationY } = stopLayout[id];
      const point = new Vector3(markerAnchor[0], markerAnchor[1] + bounds[1], markerAnchor[2])
        .applyEuler(new Euler(0, rotationY, 0))
        .add(new Vector3(...ground));
      return [id, point];
    }),
  ) as Record<StopId, Vector3>;
}

/** Pins each marker button over its stop every frame, and hides it while the stop is out of view
 *  so off-screen markers can't be tabbed to. The buttons are plain DOM beside the canvas. */
export function MarkerTracker({ frame }: { frame: FrameState }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const anchors = useMemo(markerWorldAnchors, []);

  // Registered after CameraRig, so it runs after the camera has moved this frame.
  useFrame(() => {
    camera.updateMatrixWorld();
    for (const id of STOP_IDS) {
      const el = getMarker(id);
      if (!el) continue;
      projected.copy(anchors[id]).project(camera);
      const inFront = projected.z < 1;
      const show = inFront && frame.proximity[id].current >= MARKER_MIN_PROXIMITY;
      const visibility = show ? 'visible' : 'hidden';
      if (el.style.visibility !== visibility) el.style.visibility = visibility;
      if (!show) continue;
      const x = ((projected.x + 1) / 2) * size.width;
      const y = ((1 - projected.y) / 2) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    }
  });

  return null;
}

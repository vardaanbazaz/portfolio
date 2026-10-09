import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { PAGE_IDS } from '../pages/contract';
import { PAGE_SECTION } from '../sections/layouts';
import type { FrameState } from './frameState';
import { markerWorldAnchor } from './layout';
import { getMarker } from './markerRegistry';
import { MARKER_MIN_PROXIMITY } from './tuning';

const projected = new Vector3();

/** Pins each marker button over its box every frame, and hides it while its section is out of view
 *  so off-screen markers can't be tabbed to. The buttons are plain DOM beside the canvas. */
export function MarkerTracker({ frame }: { frame: FrameState }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const anchors = useMemo(() => PAGE_IDS.map((id) => [id, markerWorldAnchor(id)] as const), []);

  // Registered after CameraRig, so it runs after the camera has moved this frame.
  useFrame(() => {
    camera.updateMatrixWorld();
    for (const [id, anchor] of anchors) {
      const el = getMarker(id);
      if (!el) continue;
      projected.copy(anchor).project(camera);
      const inFront = projected.z < 1;
      const show = inFront && frame.proximity[PAGE_SECTION[id]].current >= MARKER_MIN_PROXIMITY;
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

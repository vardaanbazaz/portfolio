import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { backdropObjectView } from '../environment/backdropPlayer';
import { sectionOpacity } from '../environment/backdrops';
import { MARKERS } from '../sections/layouts';
import type { FrameState } from './frameState';
import { markerWorldAnchor } from './layout';
import { getMarker, getObjectHit } from './markerRegistry';
import { MARKER_MIN_PROXIMITY, MARKER_SIDE_GUTTER_PX, MARKER_TOP_GUTTER_PX, OBJECT_HIT_MIN_PX, OBJECT_MARKER_GAP_PX } from './tuning';

const projected = new Vector3();

function setVisibility(el: HTMLElement, show: boolean) {
  const visibility = show ? 'visible' : 'hidden';
  if (el.style.visibility !== visibility) el.style.visibility = visibility;
}

/** Pins each marker button over its box every frame, and hides it while its section is out of view or faded out
 *  (`sectionOpacity`), so markers of a section that isn't drawn can't be tabbed to or clicked. A marker whose section
 *  a backdrop object stands in for is pinned above that object's top instead, kept inside the side gutters and below
 *  the menu bar, and shows while the object does (and is in the view); the area that takes presses on the object (its
 *  outline and its sign together) follows it. The buttons are plain DOM beside the canvas. */
export function MarkerTracker({ frame }: { frame: FrameState }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const anchors = useMemo(() => MARKERS.map((m) => [m, markerWorldAnchor(m)] as const), []);

  // Registered after CameraRig, so it runs after the camera has moved this frame.
  useFrame(() => {
    camera.updateMatrixWorld();
    for (const [{ key, section }, anchor] of anchors) {
      const el = getMarker(key);
      if (!el) continue;
      const near = frame.proximity[section].current >= MARKER_MIN_PROXIMITY;

      const object = backdropObjectView(key);
      // Until its world has come in, a marker with an object shows over its section's own visuals, as any other.
      if (!object) {
        const hit = getObjectHit(key);
        if (hit) setVisibility(hit, false);
      }
      if (object) {
        const show = near && object.shown;
        setVisibility(el, show);
        const hit = getObjectHit(key);
        if (hit) setVisibility(hit, show);
        if (!show) continue;
        const { hit: box, top } = object;
        const half = el.offsetWidth / 2;
        const x = Math.min(Math.max(top[0], MARKER_SIDE_GUTTER_PX + half), size.width - MARKER_SIDE_GUTTER_PX - half);
        // Kept below the menu bar too: a tall tower's top can lie near the view's top edge.
        const y = Math.max(top[1] - OBJECT_MARKER_GAP_PX, MARKER_TOP_GUTTER_PX + el.offsetHeight);
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
        if (hit) {
          const width = Math.max(box.width, OBJECT_HIT_MIN_PX);
          const height = Math.max(box.height, OBJECT_HIT_MIN_PX);
          const left = box.left + box.width / 2 - width / 2;
          const top = box.top + box.height / 2 - height / 2;
          hit.style.width = `${width.toFixed(1)}px`;
          hit.style.height = `${height.toFixed(1)}px`;
          hit.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`;
        }
        continue;
      }

      projected.copy(anchor).project(camera);
      const inFront = projected.z < 1;
      const show = inFront && near && sectionOpacity(frame.pathT.current, section) > 0;
      setVisibility(el, show);
      if (!show) continue;
      const x = ((projected.x + 1) / 2) * size.width;
      const y = ((1 - projected.y) / 2) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    }
  });

  return null;
}

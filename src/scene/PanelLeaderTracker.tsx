import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, Vector3 } from 'three';
import type { PlacedMarker } from '../sections/layouts';
import { sectionToWorld } from './layout';
import { getLeader, getPanel } from './panelRegistry';

/** How far the leader line's panel end stays from the panel's corners, in pixels. */
const CORNER_CLEARANCE_PX = 16;

const anchor = new Vector3();

interface PanelLeaderTrackerProps {
  /** The marker whose panel is open; undefined when no panel is. */
  target: PlacedMarker | undefined;
  /** The panel sits below its box rather than to its right. */
  stacked: boolean;
}

/** Joins the open panel to its box with the leader line every frame: from the face of the box that looks toward
 *  the panel to the nearest point on the panel's facing edge. */
export function PanelLeaderTracker({ target, stacked }: PanelLeaderTrackerProps) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  // Registered after CameraRig, so it runs after the camera has moved this frame.
  useFrame(() => {
    const line = getLeader();
    const panel = getPanel();
    if (!line || !panel || !target) return;

    const { centre, half } = target.marker.box;
    const face: [number, number, number] = stacked
      ? [centre[0], centre[1] - half[1], centre[2]]
      : [centre[0] + half[0], centre[1], centre[2]];
    camera.updateMatrixWorld();
    sectionToWorld(target.section, face, anchor).project(camera);
    const x1 = ((anchor.x + 1) / 2) * size.width;
    const y1 = ((1 - anchor.y) / 2) * size.height;

    const rect = panel.getBoundingClientRect();
    const clampTo = (v: number, min: number, max: number) =>
      MathUtils.clamp(v, min + CORNER_CLEARANCE_PX, Math.max(min + CORNER_CLEARANCE_PX, max - CORNER_CLEARANCE_PX));
    const x2 = stacked ? clampTo(x1, rect.left, rect.right) : rect.left;
    const y2 = stacked ? rect.top : clampTo(y1, rect.top, rect.bottom);

    line.setAttribute('x1', x1.toFixed(1));
    line.setAttribute('y1', y1.toFixed(1));
    line.setAttribute('x2', x2.toFixed(1));
    line.setAttribute('y2', y2.toFixed(1));
  });

  return null;
}

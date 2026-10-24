import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { sectionOpacity, worldOpacity } from '../environment/backdrops';
import { SECTION_IDS } from '../sections/contract';
import type { FrameValue } from '../visuals/shared';

/** Whether anything is drawn on the canvas at path position t: the dome and grid, or any section's visuals. Not at
 *  the landing, nor anywhere between two worlds that both have a backdrop. */
export const canvasDrawn = (t: number) => worldOpacity(t) > 0 || SECTION_IDS.some((id) => sectionOpacity(t, id) > 0);

/**
 * Draws the scene only while something is drawn on the canvas, and hides the canvas while nothing is, so the browser
 * neither clears it every frame nor lays an empty full-view layer over the backdrops. A frame callback with a
 * priority takes the drawing over from the canvas's own loop; every other callback still runs each frame.
 */
export function RenderGate({ pathT }: { pathT: FrameValue<number> }) {
  const shown = useRef<boolean | null>(null);
  const canvas = useThree((s) => s.gl.domElement);
  useFrame(({ gl, scene, camera }) => {
    const drawn = canvasDrawn(pathT.current);
    if (drawn !== shown.current) {
      shown.current = drawn;
      canvas.style.visibility = drawn ? '' : 'hidden';
      canvas.dataset.drawn = drawn ? 'true' : 'false';
    }
    if (drawn) gl.render(scene, camera);
  }, 1);
  return null;
}

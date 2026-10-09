import { useFrame } from '@react-three/fiber';
import { SECTION_IDS } from '../sections/contract';
import { landingOpacity } from './cameraPath';
import type { FrameState } from './frameState';
import { getCaption, getLanding } from './overlayRegistry';

/** Fades an overlay element; fully faded elements are hidden so they leave the accessibility tree. */
function fade(el: HTMLElement | null | undefined, opacity: number) {
  if (!el) return;
  const visibility = opacity > 0 ? 'visible' : 'hidden';
  if (el.style.visibility !== visibility) el.style.visibility = visibility;
  el.style.opacity = opacity.toFixed(3);
}

/** Shows the landing text at the start of the path, and each section's title and one-liner as the camera nears it. */
export function OverlayTracker({ frame }: { frame: FrameState }) {
  useFrame(() => {
    fade(getLanding(), landingOpacity(frame.pathT.current));
    for (const id of SECTION_IDS) fade(getCaption(id), frame.proximity[id].current);
  });
  return null;
}

import { useCallback, useRef, type PointerEvent } from 'react';
import { backdropObjectHit } from '../environment/backdropPlayer';
import { prefetchTarget } from '../preload';
import type { MarkerTarget } from '../sections/contract';
import type { PlacedMarker } from '../sections/layouts';
import { registerObjectHit } from './markerRegistry';

interface BackdropHitProps {
  placed: PlacedMarker;
  onOpen: (target: MarkerTarget) => void;
  onHoverChange: (hovered: boolean) => void;
}

/**
 * Takes presses on the backdrop object standing for a marker. The backdrop is behind the canvas, so this sits over
 * the canvas, placed over the object every frame by MarkerTracker. Only the object's solid pixels count. A press
 * opens what the marker opens, as clicking the marker does. Hidden from screen readers and never focused: the marker
 * button stays the way in for them and for the keyboard.
 */
export function BackdropHit({ placed, onOpen, onHoverChange }: BackdropHitProps) {
  const { key, marker } = placed;
  const ref = useCallback((el: HTMLDivElement | null) => registerObjectHit(key, el), [key]);
  const over = useRef(false);

  const onObject = (e: PointerEvent<HTMLDivElement>) => backdropObjectHit(key, e.clientX, e.clientY);
  const hover = (e: PointerEvent<HTMLDivElement>, on: boolean) => {
    e.currentTarget.style.cursor = on ? 'pointer' : '';
    if (on === over.current) return;
    over.current = on;
    if (on) prefetchTarget(marker.page, marker.item);
    onHoverChange(on);
  };

  return (
    <div
      ref={ref}
      className="backdrop-hit"
      aria-hidden="true"
      onPointerMove={(e) => hover(e, onObject(e))}
      onPointerLeave={(e) => hover(e, false)}
      onPointerDown={(e) => {
        if (onObject(e)) prefetchTarget(marker.page, marker.item);
      }}
      onClick={(e) => {
        if (backdropObjectHit(key, e.clientX, e.clientY)) onOpen({ page: marker.page, item: marker.item });
      }}
    />
  );
}

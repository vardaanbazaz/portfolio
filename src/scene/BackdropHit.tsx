import { useCallback, useRef, type PointerEvent } from 'react';
import { backdropObjectAt } from '../environment/backdropPlayer';
import { prefetchTarget } from '../preload';
import type { MarkerTarget } from '../sections/contract';
import { MARKERS, type PlacedMarker } from '../sections/layouts';
import { registerObjectHit } from './markerRegistry';

interface BackdropHitProps {
  placed: PlacedMarker;
  onOpen: (target: MarkerTarget) => void;
  /** The marker whose object the pointer is over now, or null. */
  onHoverChange: (hovered: PlacedMarker | null) => void;
}

const byKey = new Map(MARKERS.map((placed) => [placed.key, placed]));

/** The marker whose object a point of the view lands on: the front one where objects overlap. */
const placedAt = (x: number, y: number) => {
  const key = backdropObjectAt(x, y);
  return key ? (byKey.get(key) ?? null) : null;
};

/**
 * Takes presses on the backdrop object standing for a marker. The backdrop is behind the canvas, so this sits over
 * the canvas, placed over the object every frame by MarkerTracker. Only the objects' solid pixels count: where two
 * objects' areas overlap, a press goes to whichever object is under it (the front one if both are), whichever area
 * took it. A press opens what that object's marker opens, as clicking the marker does. Hidden from screen readers and
 * never focused: the marker buttons stay the way in for them and for the keyboard.
 */
export function BackdropHit({ placed, onOpen, onHoverChange }: BackdropHitProps) {
  const { key } = placed;
  const ref = useCallback((el: HTMLDivElement | null) => registerObjectHit(key, el), [key]);
  const over = useRef<PlacedMarker | null>(null);

  const hover = (e: PointerEvent<HTMLDivElement>, on: PlacedMarker | null) => {
    e.currentTarget.style.cursor = on ? 'pointer' : '';
    if (on === over.current) return;
    over.current = on;
    if (on) prefetchTarget(on.marker.page, on.marker.item);
    onHoverChange(on);
  };

  return (
    <div
      ref={ref}
      className="backdrop-hit"
      data-marker={key}
      aria-hidden="true"
      onPointerMove={(e) => hover(e, placedAt(e.clientX, e.clientY))}
      onPointerLeave={(e) => hover(e, null)}
      onPointerDown={(e) => {
        const on = placedAt(e.clientX, e.clientY);
        if (on) prefetchTarget(on.marker.page, on.marker.item);
      }}
      onClick={(e) => {
        const on = placedAt(e.clientX, e.clientY);
        if (on) onOpen({ page: on.marker.page, item: on.marker.item });
      }}
    />
  );
}

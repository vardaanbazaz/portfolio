import { useCallback } from 'react';
import type { StopId } from '../stops/contract';
import { STOP_LABELS, UI } from '../ui/strings';
import { registerMarker } from './markerRegistry';

interface MarkerProps {
  id: StopId;
  onOpen: (id: StopId) => void;
  onHoverChange: (hovered: boolean) => void;
}

/** The accessible control for a stop: a plain button beside the canvas, pinned over its stop by MarkerTracker. */
export function Marker({ id, onOpen, onHoverChange }: MarkerProps) {
  const ref = useCallback((el: HTMLButtonElement | null) => registerMarker(id, el), [id]);
  const label = STOP_LABELS[id];

  return (
    <button
      ref={ref}
      type="button"
      className="marker"
      aria-label={UI.openStop(label)}
      onClick={() => onOpen(id)}
      onPointerEnter={() => onHoverChange(true)}
      onPointerLeave={() => onHoverChange(false)}
      onFocus={() => onHoverChange(true)}
      onBlur={() => onHoverChange(false)}
    >
      {label}
    </button>
  );
}

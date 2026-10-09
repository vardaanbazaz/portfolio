import { useCallback } from 'react';
import { PAGE_LABELS } from '../content/scene';
import type { PageId } from '../pages/contract';
import { UI } from '../ui/strings';
import { registerMarker } from './markerRegistry';

interface MarkerProps {
  id: PageId;
  onOpen: (id: PageId) => void;
  onHoverChange: (hovered: boolean) => void;
}

/** The accessible control for a page: a plain button beside the canvas, pinned over its box by MarkerTracker. */
export function Marker({ id, onOpen, onHoverChange }: MarkerProps) {
  const ref = useCallback((el: HTMLButtonElement | null) => registerMarker(id, el), [id]);
  const label = PAGE_LABELS[id];

  return (
    <button
      ref={ref}
      type="button"
      className="marker"
      aria-label={UI.openPage(label)}
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

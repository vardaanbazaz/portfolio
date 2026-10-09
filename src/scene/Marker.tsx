import { useCallback } from 'react';
import { markerLabel, PAGE_LABELS } from '../content/scene';
import { markerKey, type MarkerTarget } from '../sections/contract';
import { UI } from '../ui/strings';
import { registerMarker } from './markerRegistry';

interface MarkerProps {
  target: MarkerTarget;
  onOpen: (target: MarkerTarget) => void;
  onHoverChange: (hovered: boolean) => void;
}

/** The accessible control for a marker: a plain button beside the canvas, pinned over its box by MarkerTracker. */
export function Marker({ target, onOpen, onHoverChange }: MarkerProps) {
  const key = markerKey(target);
  const ref = useCallback((el: HTMLButtonElement | null) => registerMarker(key, el), [key]);
  const label = markerLabel(target);

  return (
    <button
      ref={ref}
      type="button"
      className="marker"
      aria-label={target.item ? UI.openItem(label, PAGE_LABELS[target.page]) : UI.openPage(label)}
      onClick={() => onOpen(target)}
      onPointerEnter={() => onHoverChange(true)}
      onPointerLeave={() => onHoverChange(false)}
      onFocus={() => onHoverChange(true)}
      onBlur={() => onHoverChange(false)}
    >
      {label}
    </button>
  );
}

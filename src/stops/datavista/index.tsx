import type { StopVisualModule, StopVisualProps } from '../contract';
import { GreyBox } from '../GreyBox';
import { bounds } from './bounds';

function DataVistaVisual(props: StopVisualProps) {
  return <GreyBox {...props} halfExtents={bounds} />;
}

export const datavistaVisual: StopVisualModule = {
  id: 'datavista',
  Visual: DataVistaVisual,
  bounds,
  markerAnchor: [0, bounds[1] + 0.4, 0],
};

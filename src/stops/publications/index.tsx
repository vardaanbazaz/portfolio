import type { StopVisualModule, StopVisualProps } from '../contract';
import { GreyBox } from '../GreyBox';
import { bounds } from './bounds';

function PublicationsVisual(props: StopVisualProps) {
  return <GreyBox {...props} halfExtents={bounds} />;
}

export const publicationsVisual: StopVisualModule = {
  id: 'publications',
  Visual: PublicationsVisual,
  bounds,
  markerAnchor: [0, bounds[1] + 0.4, 0],
};

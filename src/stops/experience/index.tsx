import type { StopVisualModule, StopVisualProps } from '../contract';
import { GreyBox } from '../GreyBox';
import { bounds } from './bounds';

function ExperienceVisual(props: StopVisualProps) {
  return <GreyBox {...props} halfExtents={bounds} />;
}

export const experienceVisual: StopVisualModule = {
  id: 'experience',
  Visual: ExperienceVisual,
  bounds,
  markerAnchor: [0, bounds[1] + 0.4, 0],
};

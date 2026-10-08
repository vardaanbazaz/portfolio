import type { StopId, StopVisualModule } from './contract';
import { datavistaVisual } from './datavista';
import { publicationsVisual } from './publications';
import { experienceVisual } from './experience';

export const stopVisuals: Record<StopId, StopVisualModule> = {
  datavista: datavistaVisual,
  publications: publicationsVisual,
  experience: experienceVisual,
};

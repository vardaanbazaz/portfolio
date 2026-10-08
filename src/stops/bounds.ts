import type { StopId, StopVisualModule } from './contract';
import { bounds as datavista } from './datavista/bounds';
import { bounds as publications } from './publications/bounds';
import { bounds as experience } from './experience/bounds';

/** Each stop visual's bounds, without loading the visuals themselves. */
export const stopBounds: Record<StopId, StopVisualModule['bounds']> = { datavista, publications, experience };

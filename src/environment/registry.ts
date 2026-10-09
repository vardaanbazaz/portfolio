import type { EnvironmentModule, ZoneVisualModule } from './contract';
import { greyboxEnvironment } from './greybox';

export const environment: EnvironmentModule = greyboxEnvironment;

/** At most one per zone. A zone without one shows only the blended environment. */
export const zoneVisuals: readonly ZoneVisualModule[] = [];

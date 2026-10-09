import type { ComponentType } from 'react';
import type { FrameValue, Quality } from '../visuals/shared';
import type { ZoneId } from './zones';

export interface EnvironmentProps {
  /** The camera's eased path position t, 0..1.
   *  Updated every frame; read `.current` inside useFrame. */
  pathT: FrameValue<number>;
  quality: Quality;
}

export interface EnvironmentModule {
  /** Renders in world space. Owns the scene background, fog, ground and lights,
   *  blended between the zone presets (`blendZones` in `zones.ts`) by path position. */
  World: ComponentType<EnvironmentProps>;
  /** Optional: preload anything local (bundled) before first render. */
  preload?: () => Promise<void>;
}

export interface ZoneVisualProps {
  /** 1 at the zone's own path point, easing to 0 at its neighbours' points (`zoneWeight`).
   *  Updated every frame; read `.current` inside useFrame. */
  presence: FrameValue<number>;
  quality: Quality;
}

export interface ZoneVisualModule {
  id: ZoneId;
  /** Renders in world space. Not drawn while `presence` is 0. */
  Visual: ComponentType<ZoneVisualProps>;
  /** Optional: preload anything local (bundled) before first render. */
  preload?: () => Promise<void>;
}

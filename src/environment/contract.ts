import type { ComponentType } from 'react';
import type { FrameValue, Quality } from '../visuals/shared';

export interface EnvironmentProps {
  /** The camera's eased path position t, 0..1.
   *  Updated every frame; read `.current` inside useFrame. */
  pathT: FrameValue<number>;
  quality: Quality;
}

export interface EnvironmentModule {
  /** Renders in world space. Owns the scene background and fog. */
  World: ComponentType<EnvironmentProps>;
  /** Optional: preload anything local (bundled) before first render. */
  preload?: () => Promise<void>;
}

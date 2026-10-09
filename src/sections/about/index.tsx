import type { SectionVisualModule, SectionVisualProps } from '../contract';
import { GreyBox } from '../GreyBox';
import { layout } from './layout';

function AboutVisual({ proximity, hovered, quality }: SectionVisualProps) {
  return <GreyBox halfExtents={layout.bounds} proximity={proximity} hovered={hovered !== null} quality={quality} />;
}

export const aboutVisual: SectionVisualModule = {
  id: 'about',
  Visual: AboutVisual,
  layout,
};

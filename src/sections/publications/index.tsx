import type { SectionVisualModule, SectionVisualProps } from '../contract';
import { GreyBox } from '../GreyBox';
import { layout } from './layout';

function PublicationsVisual({ proximity, hovered, quality }: SectionVisualProps) {
  return <GreyBox halfExtents={layout.bounds} proximity={proximity} hovered={hovered !== null} quality={quality} />;
}

export const publicationsVisual: SectionVisualModule = {
  id: 'publications',
  Visual: PublicationsVisual,
  layout,
};

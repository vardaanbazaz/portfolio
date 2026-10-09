import type { SectionVisualModule, SectionVisualProps } from '../contract';
import { GreyBox } from '../GreyBox';
import { layout } from './layout';

/** One grey box per project. */
function ProjectsVisual({ proximity, hovered, quality }: SectionVisualProps) {
  return (
    <>
      {layout.markers.map(({ page, box }) => (
        <group key={page} position={box.centre}>
          <GreyBox halfExtents={box.half} proximity={proximity} hovered={hovered === page} quality={quality} />
        </group>
      ))}
    </>
  );
}

export const projectsVisual: SectionVisualModule = {
  id: 'projects',
  Visual: ProjectsVisual,
  layout,
};

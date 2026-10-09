import { markerKey, type SectionVisualModule, type SectionVisualProps } from '../contract';
import { GreyBox } from '../GreyBox';
import { layout } from './layout';

/** One grey box per role. */
function ExperienceVisual({ proximity, hovered, quality }: SectionVisualProps) {
  return (
    <>
      {layout.markers.map((marker) => (
        <group key={markerKey(marker)} position={marker.box.centre}>
          <GreyBox halfExtents={marker.box.half} proximity={proximity} hovered={hovered === markerKey(marker)} quality={quality} />
        </group>
      ))}
    </>
  );
}

export const experienceVisual: SectionVisualModule = {
  id: 'experience',
  Visual: ExperienceVisual,
  layout,
};

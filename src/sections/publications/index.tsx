import { markerKey, type SectionVisualModule, type SectionVisualProps } from '../contract';
import { GreyBox } from '../GreyBox';
import { layout } from './layout';

/** One grey box per paper. */
function PublicationsVisual({ proximity, hovered, quality }: SectionVisualProps) {
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

export const publicationsVisual: SectionVisualModule = {
  id: 'publications',
  Visual: PublicationsVisual,
  layout,
};

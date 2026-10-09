import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Vector3, type Group } from 'three';
import type { PageId } from '../pages/contract';
import type { SectionId } from '../sections/contract';
import { sectionVisuals } from '../sections/registry';
import type { FrameValue, Quality } from '../visuals/shared';
import { sectionInRange } from './culling';
import { nearestMarkerIndex, sectionLayout } from './layout';

export interface SectionHandlers {
  onOpen: (page: PageId) => void;
}

interface SectionAnchorProps extends SectionHandlers {
  id: SectionId;
  proximity: FrameValue<number>;
  quality: Quality;
  /** The page of this section that is opening, open or closing. */
  active: PageId | null;
  /** The page whose marker button is hovered or keyboard-focused, if it is in this section. */
  markerHovered: PageId | null;
}

const scratchLocal = new Vector3();

/** Places a section visual in the world, and skips drawing it while it is out of range.
 *  Clicking the visual opens the page whose marker box is nearest the click. The visual itself only knows its local space. */
export function SectionAnchor({ id, proximity, quality, active, markerHovered, onOpen }: SectionAnchorProps) {
  const { Visual, layout } = sectionVisuals[id];
  const { bounds, markers } = layout;
  const { ground, rotationY } = sectionLayout[id];
  const root = useRef<Group>(null);
  const lifted = useRef<Group>(null);
  const [meshHovered, setMeshHovered] = useState<PageId | null>(null);
  const centre = useMemo(() => new Vector3(ground[0], bounds[1], ground[2]), [ground, bounds]);
  const radius = Math.hypot(...bounds);

  useFrame(({ camera }) => {
    if (root.current) root.current.visible = sectionInRange(camera.position.distanceTo(centre), radius, quality);
  });

  useEffect(() => {
    document.body.style.cursor = meshHovered ? 'pointer' : '';
  }, [meshHovered]);
  useEffect(() => () => void (document.body.style.cursor = ''), []);

  /** The page whose box is nearest the pointer's hit point. */
  const pageAt = (e: ThreeEvent<PointerEvent | MouseEvent>): PageId => {
    if (markers.length === 1 || !lifted.current) return markers[0].page;
    lifted.current.worldToLocal(scratchLocal.copy(e.point));
    return markers[nearestMarkerIndex(markers.map((m) => m.box), scratchLocal.x, scratchLocal.z)].page;
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const page = pageAt(e);
    setMeshHovered((cur) => (cur === page ? cur : page));
  };

  return (
    <group
      ref={root}
      position={ground}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(pageAt(e));
      }}
      onPointerMove={onPointerMove}
      onPointerOut={() => setMeshHovered(null)}
    >
      {/* Lift by the half-height so the visual's centred box sits on the floor. */}
      <group ref={lifted} position={[0, bounds[1], 0]}>
        <Visual proximity={proximity} active={active} hovered={markerHovered ?? meshHovered} quality={quality} />
      </group>
    </group>
  );
}

import { useEffect, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { StopId } from '../stops/contract';
import { stopVisuals } from '../stops/registry';
import type { FrameValue, Quality } from '../visuals/shared';
import { stopLayout } from './layout';

export interface StopHandlers {
  onOpen: (id: StopId) => void;
}

interface StopAnchorProps extends StopHandlers {
  id: StopId;
  proximity: FrameValue<number>;
  quality: Quality;
  active: boolean;
  /** The stop's marker button is hovered or keyboard-focused. */
  markerHovered: boolean;
}

/** Places a stop visual in the world. Clicking the box does the same as its marker.
 *  The visual itself only knows its local space. */
export function StopAnchor({ id, proximity, quality, active, markerHovered, onOpen }: StopAnchorProps) {
  const { Visual, bounds } = stopVisuals[id];
  const { ground, rotationY } = stopLayout[id];
  const [meshHovered, setMeshHovered] = useState(false);

  useEffect(() => {
    document.body.style.cursor = meshHovered ? 'pointer' : '';
  }, [meshHovered]);
  useEffect(() => () => void (document.body.style.cursor = ''), []);

  const onPointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setMeshHovered(true);
  };

  return (
    <group
      position={ground}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(id);
      }}
      onPointerOver={onPointerOver}
      onPointerOut={() => setMeshHovered(false)}
    >
      {/* Lift by the half-height so the visual's centred box sits on the floor. */}
      <group position={[0, bounds[1], 0]}>
        <Visual proximity={proximity} active={active} hovered={markerHovered || meshHovered} quality={quality} />
      </group>
    </group>
  );
}

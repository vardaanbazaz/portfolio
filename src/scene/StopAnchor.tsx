import type { StopId } from '../stops/contract';
import { stopVisuals } from '../stops/registry';
import type { FrameValue, Quality } from '../visuals/shared';
import { stopLayout } from './layout';

interface StopAnchorProps {
  id: StopId;
  proximity: FrameValue<number>;
  quality: Quality;
}

/** Places a stop visual in the world. The visual itself only knows its local space. */
export function StopAnchor({ id, proximity, quality }: StopAnchorProps) {
  const { Visual, bounds } = stopVisuals[id];
  const { ground, rotationY } = stopLayout[id];

  return (
    <group position={ground} rotation={[0, rotationY, 0]}>
      {/* Lift by the half-height so the visual's centred box sits on the floor. */}
      <group position={[0, bounds[1], 0]}>
        <Visual proximity={proximity} active={false} hovered={false} quality={quality} />
      </group>
    </group>
  );
}

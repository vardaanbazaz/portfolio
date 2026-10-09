import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { FrameValue, Quality } from '../visuals/shared';
import type { ZoneVisualModule } from './contract';
import { zoneWeight } from './zones';

interface ZoneSlotProps {
  module: ZoneVisualModule;
  pathT: FrameValue<number>;
  quality: Quality;
}

function ZoneSlot({ module, pathT, quality }: ZoneSlotProps) {
  const group = useRef<Group>(null);
  // Read straight from the path position, so the visual sees this frame's value whatever order frames run in.
  const presence = useMemo<FrameValue<number>>(
    () => ({
      get current() {
        return zoneWeight(pathT.current, module.id);
      },
    }),
    [pathT, module.id],
  );
  const { Visual } = module;

  useFrame(() => {
    if (group.current) group.current.visible = presence.current > 0;
  });

  return (
    <group ref={group} visible={false}>
      <Visual presence={presence} quality={quality} />
    </group>
  );
}

/** Each zone's own visuals, drawn only while their zone has any presence. */
export function ZoneVisuals({ modules, pathT, quality }: { modules: readonly ZoneVisualModule[] } & Omit<ZoneSlotProps, 'module'>) {
  return (
    <>
      {modules.map((module) => (
        <ZoneSlot key={module.id} module={module} pathT={pathT} quality={quality} />
      ))}
    </>
  );
}

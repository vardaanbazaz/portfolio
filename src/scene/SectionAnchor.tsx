import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Vector3, type Group, type Material, type Mesh } from 'three';
import { sectionOpacity } from '../environment/backdrops';
import { prefetchTarget } from '../preload';
import { markerKey, type MarkerKey, type MarkerTarget, type SectionId, type SectionMarker } from '../sections/contract';
import { sectionVisuals } from '../sections/registry';
import type { FrameValue, Quality } from '../visuals/shared';
import { sectionInRange } from './culling';
import { nearestMarkerIndex, sectionLayout } from './layout';

export interface SectionHandlers {
  onOpen: (target: MarkerTarget) => void;
}

interface SectionAnchorProps extends SectionHandlers {
  id: SectionId;
  pathT: FrameValue<number>;
  proximity: FrameValue<number>;
  quality: Quality;
  /** The marker of this section whose page or panel is opening, open or closing. */
  active: MarkerKey | null;
  /** The marker whose button is hovered or keyboard-focused, if it is in this section. */
  markerHovered: MarkerKey | null;
}

const scratchLocal = new Vector3();

/** Sets every material under `root` to `opacity`. Each is made transparent once, the first time it is seen, so the
 *  fade never changes a shader mid-scroll. */
function fadeMaterials(root: Group, opacity: number) {
  root.traverse((object) => {
    const material = (object as Mesh).material as Material | Material[] | undefined;
    if (!material) return;
    for (const m of Array.isArray(material) ? material : [material]) {
      if (!m.transparent) {
        m.transparent = true;
        m.needsUpdate = true;
      }
      m.opacity = opacity;
    }
  });
}

/** Places a section visual in the world, and skips drawing it while it is out of range.
 *  Fades it by `sectionOpacity`, so it never shows over another zone's backdrop; while that is 0 it isn't drawn.
 *  Clicking the visual opens the target of the marker whose box is nearest the click. The visual itself only knows its local space. */
export function SectionAnchor({ id, pathT, proximity, quality, active, markerHovered, onOpen }: SectionAnchorProps) {
  const { Visual, layout } = sectionVisuals[id];
  const { bounds, markers } = layout;
  const { ground, rotationY } = sectionLayout[id];
  const root = useRef<Group>(null);
  const lifted = useRef<Group>(null);
  const [meshHovered, setMeshHovered] = useState<MarkerKey | null>(null);
  const centre = useMemo(() => new Vector3(ground[0], bounds[1], ground[2]), [ground, bounds]);
  const radius = Math.hypot(...bounds);
  const canvas = useThree((s) => s.gl.domElement);
  const drawn = useRef(-1);

  useFrame(({ camera }) => {
    if (!root.current || !lifted.current) return;
    const opacity = sectionOpacity(pathT.current, id);
    const visible = opacity > 0 && sectionInRange(camera.position.distanceTo(centre), radius, quality);
    root.current.visible = visible;
    if (visible) fadeMaterials(lifted.current, opacity);
    else if (meshHovered !== null) setMeshHovered(null);
    // What is drawn, on the canvas for the tests to read: 0 when hidden, else the opacity. Written on change only.
    const shown = visible ? opacity : 0;
    if (shown !== drawn.current) {
      drawn.current = shown;
      canvas.setAttribute(`data-section-${id}`, shown.toFixed(3));
    }
  });

  useEffect(() => {
    document.body.style.cursor = meshHovered ? 'pointer' : '';
  }, [meshHovered]);
  useEffect(() => () => void (document.body.style.cursor = ''), []);

  /** The marker whose box is nearest the pointer's hit point. */
  const markerAt = (e: ThreeEvent<PointerEvent | MouseEvent>): SectionMarker => {
    if (markers.length === 1 || !lifted.current) return markers[0];
    lifted.current.worldToLocal(scratchLocal.copy(e.point));
    return markers[nearestMarkerIndex(markers.map((m) => m.box), scratchLocal.x, scratchLocal.z)];
  };

  // Hovering or pressing a box starts fetching what its marker opens, as the marker's button does.
  useEffect(() => {
    const hovered = markers.find((m) => markerKey(m) === meshHovered);
    if (hovered) prefetchTarget(hovered.page, hovered.item);
  }, [markers, meshHovered]);

  // three's raycaster also hits hidden objects. A hidden section lets the event pass to whatever is behind it.
  const hidden = () => !root.current?.visible;

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (hidden()) return;
    e.stopPropagation();
    const key = markerKey(markerAt(e));
    setMeshHovered((cur) => (cur === key ? cur : key));
  };

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (hidden()) return;
    const { page, item } = markerAt(e);
    prefetchTarget(page, item);
  };

  return (
    <group
      ref={root}
      position={ground}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        if (hidden()) return;
        e.stopPropagation();
        const { page, item } = markerAt(e);
        onOpen({ page, item });
      }}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerOut={() => setMeshHovered(null)}
    >
      {/* Lift by the half-height so the visual's centred box sits on the floor. */}
      <group ref={lifted} position={[0, bounds[1], 0]}>
        <Visual proximity={proximity} active={active} hovered={markerHovered ?? meshHovered} quality={quality} />
      </group>
    </group>
  );
}

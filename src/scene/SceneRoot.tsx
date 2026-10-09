import { useCallback, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { environment } from '../environment/registry';
import { STOP_IDS, type StopId } from '../stops/contract';
import { appStore, useAppState } from '../store';
import type { Quality } from '../visuals/shared';
import { CameraRig } from './CameraRig';
import { pathPos } from './cameraPath';
import { createFrameState } from './frameState';
import { Marker } from './Marker';
import { MarkerTracker } from './MarkerTracker';
import { StopAnchor, type StopHandlers } from './StopAnchor';
import { BASE_FOV, DPR_LOW, DPR_RANGE, NARROW_VIEWPORT_PX, PERF_DECLINE_BELOW_FPS } from './tuning';

const initialQuality = (): Quality => (window.innerWidth < NARROW_VIEWPORT_PX ? 'low' : 'high');

/** The one persistent canvas: environment, stops and the camera rig. It never unmounts while pages come and go. */
export function SceneRoot({ onOpen }: StopHandlers) {
  const { phase, stop } = useAppState();
  const [startQuality] = useState(initialQuality);
  const [quality, setQuality] = useState<Quality>(startQuality);
  const [dpr, setDpr] = useState<number | [number, number]>(DPR_RANGE);
  const [hoveredMarker, setHoveredMarker] = useState<StopId | null>(null);
  const frame = useMemo(createFrameState, []);
  const { World } = environment;

  // Drop to low quality on a sustained frame-rate decline and never climb back this session.
  const onDecline = () => {
    setQuality('low');
    setDpr(DPR_LOW);
  };

  const onFlyInDone = useCallback(() => appStore.dispatch({ type: 'flyInDone' }), []);
  const onFlyOutDone = useCallback(() => appStore.dispatch({ type: 'flyOutDone' }), []);

  return (
    // Inert unless exploring: markers can't be focused or clicked during a flight or under a page.
    <div className="scene" inert={phase !== 'exploring'}>
      <Canvas
        dpr={dpr}
        // The opaque page covers the scene, so stop drawing while it is open.
        frameloop={phase === 'pageOpen' ? 'demand' : 'always'}
        gl={{ antialias: startQuality === 'high' }}
        camera={{ fov: BASE_FOV, near: 0.1, far: 200, position: pathPos(0).toArray() }}
        onCreated={({ gl }) => gl.domElement.setAttribute('aria-hidden', 'true')}
      >
        <PerformanceMonitor bounds={() => [PERF_DECLINE_BELOW_FPS, Infinity]} onDecline={onDecline} />
        <CameraRig frame={frame} phase={phase} stop={stop} onFlyInDone={onFlyInDone} onFlyOutDone={onFlyOutDone} />
        <MarkerTracker frame={frame} />
        <World pathT={frame.pathT} quality={quality} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} />
        {STOP_IDS.map((id) => (
          <StopAnchor
            key={id}
            id={id}
            proximity={frame.proximity[id]}
            quality={quality}
            active={stop === id}
            markerHovered={hoveredMarker === id}
            onOpen={onOpen}
          />
        ))}
      </Canvas>
      {STOP_IDS.map((id) => (
        <Marker
          key={id}
          id={id}
          onOpen={onOpen}
          onHoverChange={(hovered) => setHoveredMarker((cur) => (hovered ? id : cur === id ? null : cur))}
        />
      ))}
    </div>
  );
}

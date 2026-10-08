import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { environment } from '../environment/registry';
import { STOP_IDS } from '../stops/contract';
import type { Quality } from '../visuals/shared';
import { CameraRig } from './CameraRig';
import { pathPos } from './cameraPath';
import { createFrameState } from './frameState';
import { StopAnchor } from './StopAnchor';
import { BASE_FOV, DPR_LOW, DPR_RANGE, NARROW_VIEWPORT_PX, PERF_DECLINE_BELOW_FPS } from './tuning';

const initialQuality = (): Quality => (window.innerWidth < NARROW_VIEWPORT_PX ? 'low' : 'high');

/** The one persistent canvas: environment, stops and the camera rig. */
export function SceneRoot() {
  const [startQuality] = useState(initialQuality);
  const [quality, setQuality] = useState<Quality>(startQuality);
  const [dpr, setDpr] = useState<number | [number, number]>(DPR_RANGE);
  const frame = useMemo(createFrameState, []);
  const { World } = environment;

  // Drop to low quality on a sustained frame-rate decline and never climb back this session.
  const onDecline = () => {
    setQuality('low');
    setDpr(DPR_LOW);
  };

  return (
    <div className="scene" aria-hidden="true">
      <Canvas
        dpr={dpr}
        gl={{ antialias: startQuality === 'high' }}
        camera={{ fov: BASE_FOV, near: 0.1, far: 200, position: pathPos(0).toArray() }}
      >
        <PerformanceMonitor bounds={() => [PERF_DECLINE_BELOW_FPS, Infinity]} onDecline={onDecline} />
        <CameraRig frame={frame} />
        <World pathT={frame.pathT} quality={quality} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} />
        {STOP_IDS.map((id) => (
          <StopAnchor key={id} id={id} proximity={frame.proximity[id]} quality={quality} />
        ))}
      </Canvas>
    </div>
  );
}

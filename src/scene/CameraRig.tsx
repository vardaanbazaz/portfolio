import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector3 } from 'three';
import { STOP_IDS } from '../stops/contract';
import { cameraPose, dampTowards, fovForAspect, scrollProgress, STOP_T, stopProximity } from './cameraPath';
import type { FrameState } from './frameState';
import { stopCentreHeights } from './layout';
import { CAMERA_DAMPING } from './tuning';

const scratchLook = new Vector3();

/** Moves the camera along the path, easing toward the window's scroll position. */
export function CameraRig({ frame }: { frame: FrameState }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const aspect = size.width / size.height;
  const maxScroll = useRef(0);
  const started = useRef(false);

  useEffect(() => {
    const measure = () => {
      maxScroll.current = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    };
    measure();
    window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => {
      window.removeEventListener('resize', measure);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      camera.fov = fovForAspect(aspect);
      camera.updateProjectionMatrix();
    }
  }, [camera, aspect]);

  useFrame((_, delta) => {
    const p = scrollProgress(window.scrollY, maxScroll.current);
    // First frame starts at the current scroll position, so a reload mid-page doesn't glide from the start.
    const t = started.current ? dampTowards(frame.pathT.current, p, CAMERA_DAMPING, delta) : p;
    started.current = true;

    frame.pathT.current = t;
    for (const id of STOP_IDS) frame.proximity[id].current = stopProximity(t, STOP_T[id]);

    cameraPose(t, aspect, stopCentreHeights, camera.position, scratchLook);
    camera.lookAt(scratchLook);
  });

  return null;
}

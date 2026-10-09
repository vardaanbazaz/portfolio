import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { animate } from 'motion/react';
import { PerspectiveCamera, Vector3 } from 'three';
import type { Phase } from '../store';
import type { PageId } from '../pages/contract';
import { SECTION_IDS } from '../sections/contract';
import { cameraPose, dampTowards, fovForAspect, scrollProgress, SECTION_T, sectionProximity } from './cameraPath';
import type { FrameState } from './frameState';
import { inspectPose, sectionCentreHeights } from './layout';
import { takeCameraSnap } from './menuTravel';
import { CAMERA_DAMPING, FLY_SECONDS } from './tuning';

const pathPosition = new Vector3();
const pathLook = new Vector3();
const inspectPosition = new Vector3();
const inspectLook = new Vector3();
const look = new Vector3();

interface CameraRigProps {
  frame: FrameState;
  phase: Phase;
  page: PageId | null;
  onFlyInDone: () => void;
  onFlyOutDone: () => void;
}

/** Moves the camera along the path, easing toward the window's scroll position,
 *  and blends to a page's inspect pose while its page is opening, open or closing. */
export function CameraRig({ frame, phase, page, onFlyInDone, onFlyOutDone }: CameraRigProps) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const aspect = size.width / size.height;
  const maxScroll = useRef(0);
  const started = useRef(false);
  /** 0 on the path, 1 at the page's inspect pose. */
  const blend = useRef(phase === 'pageOpen' || phase === 'closing' ? 1 : 0);

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

  // Fly in or out from wherever the blend is now, so a reversal mid-flight doesn't jump.
  useEffect(() => {
    if (phase !== 'flyingIn' && phase !== 'flyingOut') return;
    const to = phase === 'flyingIn' ? 1 : 0;
    const done = phase === 'flyingIn' ? onFlyInDone : onFlyOutDone;
    const distance = Math.abs(to - blend.current);
    if (distance === 0) {
      done();
      return;
    }
    const controls = animate(blend.current, to, {
      duration: FLY_SECONDS * distance,
      ease: 'easeInOut',
      onUpdate: (v) => {
        blend.current = v;
      },
      onComplete: done,
    });
    return () => controls.stop();
  }, [phase, onFlyInDone, onFlyOutDone]);

  // Redraw once when the frameloop goes on demand, so the open page sits over the final pose.
  useEffect(() => {
    if (phase === 'pageOpen') invalidate();
  }, [phase, invalidate]);

  useFrame((_, delta) => {
    const p = scrollProgress(window.scrollY, maxScroll.current);
    // First frame starts at the current scroll position, so a reload or deep link doesn't glide from the start.
    // A reduced-motion menu jump also lands at once.
    const snap = takeCameraSnap();
    const t = started.current && !snap ? dampTowards(frame.pathT.current, p, CAMERA_DAMPING, delta) : p;
    started.current = true;

    frame.pathT.current = t;
    for (const id of SECTION_IDS) frame.proximity[id].current = sectionProximity(t, SECTION_T[id]);

    cameraPose(t, aspect, sectionCentreHeights, pathPosition, pathLook);
    const b = page ? blend.current : 0;
    if (b > 0 && page) {
      inspectPose(page, aspect, inspectPosition, inspectLook);
      camera.position.lerpVectors(pathPosition, inspectPosition, b);
      look.lerpVectors(pathLook, inspectLook, b);
    } else {
      camera.position.copy(pathPosition);
      look.copy(pathLook);
    }
    camera.lookAt(look);
  });

  return null;
}

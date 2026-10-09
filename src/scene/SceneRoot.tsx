import { useCallback, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { LANDING, SECTION_LINES, SECTION_NOTES, SECTION_TITLES } from '../content/scene';
import { environment } from '../environment/registry';
import { preloadAll } from '../preload';
import { SECTION_IDS } from '../sections/contract';
import { MARKERS, markerAt, type PlacedMarker } from '../sections/layouts';
import { appStore, useAppState } from '../store';
import type { Quality } from '../visuals/shared';
import { CameraRig } from './CameraRig';
import { pathPos } from './cameraPath';
import { createFrameState } from './frameState';
import { Marker } from './Marker';
import { MarkerTracker } from './MarkerTracker';
import { OverlayTracker } from './OverlayTracker';
import { usePanelStacked } from './panelLayout';
import { PanelLeaderTracker } from './PanelLeaderTracker';
import { registerCaption, registerLanding } from './overlayRegistry';
import { SectionAnchor, type SectionHandlers } from './SectionAnchor';
import { BASE_FOV, DPR_LOW, DPR_RANGE, NARROW_VIEWPORT_PX, PERF_DECLINE_BELOW_FPS } from './tuning';

const initialQuality = (): Quality => (window.innerWidth < NARROW_VIEWPORT_PX ? 'low' : 'high');

/** Once the scene has drawn its first frame, fetches every page and panel in the background. */
function PreloadAfterFirstFrame() {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    preloadAll();
  });
  return null;
}

/** The one persistent canvas: environment, sections and the camera rig, with the landing text,
 *  section captions and marker buttons over it. It never unmounts while pages and panels come and go. */
interface SceneRootProps extends SectionHandlers {
  /** An opaque page fully covers the scene. */
  hidden: boolean;
  /** The browser lost the WebGL context mid-visit. */
  onContextLost: () => void;
}

export function SceneRoot({ onOpen, hidden, onContextLost }: SceneRootProps) {
  const { phase, page, item, panel } = useAppState();
  const stacked = usePanelStacked();
  const [startQuality] = useState(initialQuality);
  const [quality, setQuality] = useState<Quality>(startQuality);
  const [dpr, setDpr] = useState<number | [number, number]>(DPR_RANGE);
  const [hoveredMarker, setHoveredMarker] = useState<PlacedMarker | null>(null);
  const frame = useMemo(createFrameState, []);
  const { World } = environment;
  const target = useMemo(() => (page ? { page, item: item ?? undefined } : null), [page, item]);
  const activeMarker = target ? markerAt(target) : undefined;
  const framing = panel ? (stacked ? 'stacked' : 'side') : 'whole';

  // Drop to low quality on a sustained frame-rate decline and never climb back this session.
  const onDecline = () => {
    setQuality('low');
    setDpr(DPR_LOW);
  };

  const onFlyInDone = useCallback(() => appStore.dispatch({ type: 'flyInDone' }), []);
  const onFlyOutDone = useCallback(() => appStore.dispatch({ type: 'flyOutDone' }), []);

  return (
    // Inert unless exploring: markers can't be focused or clicked during a flight or under a page or panel.
    // Hidden with visibility, not display, so the canvas keeps its size and nothing reflows on return.
    // While a panel is up, the scene's text and marker buttons are hidden so they don't show through it.
    <div className={['scene', hidden && 'scene-hidden', panel && 'scene-panel'].filter(Boolean).join(' ')} inert={phase !== 'exploring'}>
      <Canvas
        dpr={dpr}
        // The opaque page covers the scene, so stop drawing while it is open. A panel keeps the scene drawing.
        frameloop={phase === 'open' && !panel ? 'demand' : 'always'}
        gl={{ antialias: startQuality === 'high' }}
        camera={{ fov: BASE_FOV, near: 0.1, far: 200, position: pathPos(0).toArray() }}
        onCreated={({ gl }) => {
          gl.domElement.setAttribute('aria-hidden', 'true');
          gl.domElement.addEventListener('webglcontextlost', onContextLost);
        }}
      >
        <PreloadAfterFirstFrame />
        <PerformanceMonitor bounds={() => [PERF_DECLINE_BELOW_FPS, Infinity]} onDecline={onDecline} />
        <CameraRig
          frame={frame}
          phase={phase}
          target={target}
          framing={framing}
          onFlyInDone={onFlyInDone}
          onFlyOutDone={onFlyOutDone}
        />
        <MarkerTracker frame={frame} />
        <PanelLeaderTracker target={panel ? activeMarker : undefined} stacked={stacked} />
        <OverlayTracker frame={frame} />
        <World pathT={frame.pathT} quality={quality} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} />
        {SECTION_IDS.map((id) => (
          <SectionAnchor
            key={id}
            id={id}
            proximity={frame.proximity[id]}
            quality={quality}
            active={activeMarker?.section === id ? activeMarker.key : null}
            markerHovered={hoveredMarker?.section === id ? hoveredMarker.key : null}
            onOpen={onOpen}
          />
        ))}
      </Canvas>
      <div className="landing" ref={registerLanding}>
        <h1 className="landing-name">{LANDING.name}</h1>
        <p className="landing-line" lang="sa">
          {LANDING.line}
        </p>
        <p className="landing-gloss verse-gloss">
          {LANDING.gloss.text} <cite>{LANDING.gloss.source}</cite>
        </p>
        <p className="landing-subline">{LANDING.subline}</p>
        <p className="landing-cue" aria-hidden="true">
          <span className="landing-cue-label">{LANDING.scrollCue.label}</span>
          <span>{LANDING.scrollCue.arrow}</span>
        </p>
      </div>
      {SECTION_IDS.map((id) => (
        <div key={id} className="caption" ref={(el) => registerCaption(id, el)}>
          <h2 className="caption-title">{SECTION_TITLES[id]}</h2>
          <p className="caption-line">{SECTION_LINES[id]}</p>
          {SECTION_NOTES[id] && <p className="caption-line">{SECTION_NOTES[id]}</p>}
        </div>
      ))}
      {MARKERS.map((placed) => (
        <Marker
          key={placed.key}
          target={placed.marker}
          onOpen={onOpen}
          onHoverChange={(hovered) => setHoveredMarker((cur) => (hovered ? placed : cur === placed ? null : cur))}
        />
      ))}
    </div>
  );
}

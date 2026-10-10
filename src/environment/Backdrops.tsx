import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useFrame } from '@react-three/fiber';
import { BACKDROP_FADE_IN_SECONDS, BACKDROP_STALL_SECONDS } from '../scene/tuning';
import type { FrameValue } from '../visuals/shared';
import { followPath, registerBackdrop, SAVE_DATA, setPageOpen } from './backdropPlayer';
import { BACKDROPS, type ZoneBackdrop } from './backdrops';

function BackdropLayer({ backdrop }: { backdrop: ZoneBackdrop }) {
  const layer = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  // Playing, so its frames are shown over the poster. A paused, stalled or failed video shows its poster instead.
  const [ready, setReady] = useState(false);
  const stall = useRef<ReturnType<typeof setTimeout>>(undefined);
  const stopStall = () => clearTimeout(stall.current);
  const stopped = () => {
    stopStall();
    setReady(false);
  };

  useEffect(() => stopStall, []);

  useLayoutEffect(() => {
    const el = video.current;
    // React sets `muted` as a property only; the attribute is what lets phones start it inline without a press.
    if (el) {
      el.muted = true;
      el.defaultMuted = true;
      el.setAttribute('muted', '');
    }
    registerBackdrop(backdrop.zone, layer.current, el);
    return () => registerBackdrop(backdrop.zone, null, null);
  }, [backdrop.zone]);

  return (
    <div ref={layer} className="backdrop" data-zone={backdrop.zone}>
      <img className="backdrop-media" src={backdrop.poster} alt="" decoding="async" />
      {!SAVE_DATA && (
        <video
          ref={video}
          className={ready ? 'backdrop-media backdrop-video backdrop-video-ready' : 'backdrop-media backdrop-video'}
          style={{ '--backdrop-fade': `${BACKDROP_FADE_IN_SECONDS}s` } as CSSProperties}
          src={backdrop.video}
          poster={backdrop.poster}
          muted
          loop
          playsInline
          // Nothing is fetched until backdropPlayer first plays it, once the loading screen has lifted.
          preload="none"
          disablePictureInPicture
          disableRemotePlayback
          onPlaying={() => {
            stopStall();
            setReady(true);
          }}
          onPause={stopped}
          onEmptied={stopped}
          onError={stopped}
          // Every loop seam waits briefly; only a longer wait hands over to the poster.
          onWaiting={() => {
            stopStall();
            stall.current = setTimeout(() => setReady(false), BACKDROP_STALL_SECONDS * 1000);
          }}
        />
      )}
      <div className="backdrop-shade" />
    </div>
  );
}

/** Each zone's backdrop video, behind the transparent canvas. Faded and played by `backdropPlayer`. */
export function Backdrops({ pageOpen }: { pageOpen: boolean }) {
  useEffect(() => setPageOpen(pageOpen), [pageOpen]);
  return (
    <div className="backdrops" aria-hidden="true">
      {BACKDROPS.map((backdrop) => (
        <BackdropLayer key={backdrop.zone} backdrop={backdrop} />
      ))}
    </div>
  );
}

/** Inside the canvas: moves every backdrop to this frame's path position. */
export function BackdropTracker({ pathT }: { pathT: FrameValue<number> }) {
  useFrame(() => followPath(pathT.current));
  return null;
}

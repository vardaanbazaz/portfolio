import { useEffect, useRef, useState } from 'react';
import { Stats } from '@react-three/drei';
import type { ShaderMaterial } from 'three';
import { backdropProbe } from '../environment/backdropPlayer';
import { backdropWeight, worldOpacity } from '../environment/backdrops';
import { sceneProbe } from './sceneProbe';

/** No scrolling for this long after a wheel event counts as its scroll having finished, where `scrollend` is
 *  missing. Both browsers smooth-scroll a notch over a few frames, so reading scrollY at once would undercount. */
const SETTLE_MS = 150;

interface WheelReading {
  deltaY: number;
  deltaMode: number;
  /** Wheel events in the burst the scroll is attributed to: notches that arrive before the last one settled. */
  events: number;
  px: number;
  pathHeight: number;
}

const MODES = ['px', 'lines', 'pages'];

/** The last wheel burst: its last event's deltaY and deltaMode, and how far the page scrolled for it, once settled. */
function useWheelReading() {
  const [reading, setReading] = useState<WheelReading | null>(null);
  useEffect(() => {
    // Recent scroll positions by time. Chromium scrolls for a passive wheel listener before the event reaches the
    // page, so scrollY in the handler may already include the notch; the position before the event's input time
    // doesn't.
    const positions = [{ at: performance.now(), y: window.scrollY }];
    const yBefore = (time: number) => {
      for (let i = positions.length - 1; i >= 0; i--) if (positions[i].at <= time) return positions[i].y;
      return positions[0].y;
    };
    let burst: { startY: number; events: number; deltaY: number; deltaMode: number } | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => {
      clearTimeout(timer);
      if (!burst) return;
      const { startY, events, deltaY, deltaMode } = burst;
      burst = null;
      setReading({
        deltaY,
        deltaMode,
        events,
        px: window.scrollY - startY,
        pathHeight: document.documentElement.scrollHeight - window.innerHeight,
      });
    };
    const wait = () => {
      clearTimeout(timer);
      timer = setTimeout(settle, SETTLE_MS);
    };
    const onWheel = (event: WheelEvent) => {
      burst ??= { startY: yBefore(event.timeStamp), events: 0, deltaY: 0, deltaMode: 0 };
      burst.events++;
      burst.deltaY = event.deltaY;
      burst.deltaMode = event.deltaMode;
      wait();
    };
    const onScroll = () => {
      positions.push({ at: performance.now(), y: window.scrollY });
      if (positions.length > 120) positions.splice(0, positions.length - 120);
      // A scroll before any wheel event (Chromium's order) waits for the event; one during a burst extends it.
      wait();
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scrollend', settle);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scrollend', settle);
    };
  }, []);
  return reading;
}

/** three's blending modes by value, as the readout names them. */
const BLENDING = ['none', 'normal', 'add', 'subtract', 'multiply', 'custom'];

const fixed = (value: number | undefined, digits: number) => (value === undefined ? '?' : value.toFixed(digits));

/** One line on the landing backdrop and what is drawn over it, as the browser has it now. The player's own record of
 *  its layer and images is checked against the elements in the page, which a hot reload can leave out of step. */
function landingBackdropLine(): string {
  const player = backdropProbe('landing');
  const layer = document.querySelector<HTMLElement>('.backdrop[data-zone="landing"]');
  const images = layer ? Array.from(layer.querySelectorAll('img')) : [];
  const t = sceneProbe.pathT?.current;
  const layerStyle = layer && getComputedStyle(layer);
  const dome = sceneProbe.dome;
  const material = dome?.material as ShaderMaterial | undefined;
  const domeOpacity = material?.uniforms?.opacity?.value as number | undefined;
  const stale = player && (player.layer !== layer || player.images.some((image, i) => image !== images[i]));
  return [
    `t ${fixed(t, 4)}`,
    'zone landing',
    // Enough digits to tell a weight a hair under 1 from 1, where the dome is still drawn.
    `weight ${t === undefined ? '?' : backdropWeight(t, 'landing').toFixed(6)}`,
    `layer ${layerStyle ? `${layerStyle.visibility === 'visible' ? 'visible' : 'hidden'} ${Number(layerStyle.opacity).toFixed(3)}` : 'none'}`,
    // The dome's opacity as its material has it, then as the path says it should be.
    `dome ${dome ? `${fixed(domeOpacity, 4)} (path ${t === undefined ? '?' : worldOpacity(t).toFixed(4)}) ${dome.visible ? 'drawn' : 'off'} ${BLENDING[material?.blending ?? -1] ?? material?.blending}` : 'none'}`,
    player ? `images ${player.decoded}/${player.total} decoded` : 'images none',
    `motion ${player?.running ? 'running' : 'stopped'}${player?.reducedMotion ? ' (reduced)' : ''}`,
    `quality ${sceneProbe.quality ?? '?'}`,
    `frameloop ${sceneProbe.frameloop ?? '?'}`,
    player ? `player ${player.held ? 'held' : 'released'}${stale ? ' stale' : ''}` : 'player none',
  ].join(' · ');
}

/** Rewrites its line every animation frame, outside React, so it keeps going while the canvas draws on demand. */
function BackdropReadout() {
  const line = useRef<HTMLOutputElement>(null);
  useEffect(() => {
    let frame = requestAnimationFrame(function update() {
      if (line.current) line.current.textContent = landingBackdropLine();
      frame = requestAnimationFrame(update);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return <output ref={line} className="dev-readout-line" data-readout="backdrop" aria-hidden="true" />;
}

/** Frame-rate readout, what the last wheel notch did to the scroll, and the landing backdrop's state. Loaded only in
 *  dev or with ?fps in the URL. */
export default function FpsReadout() {
  const wheel = useWheelReading();
  return (
    <>
      <Stats />
      <div className="dev-readout">
        <output className="dev-readout-line" data-readout="wheel" aria-hidden="true">
          {wheel
            ? `wheel deltaY ${wheel.deltaY.toFixed(1)} ${MODES[wheel.deltaMode] ?? wheel.deltaMode} (mode ${wheel.deltaMode})` +
              ` · scrolled ${wheel.px.toFixed(0)} px over ${wheel.events} event${wheel.events === 1 ? '' : 's'}` +
              ` (${(wheel.px / wheel.events).toFixed(0)} px each)` +
              ` · ${((wheel.px / wheel.pathHeight) * 100).toFixed(2)}% of path` +
              ` (${((wheel.px / wheel.events / wheel.pathHeight) * 100).toFixed(2)}% each)`
            : 'wheel: none yet'}
        </output>
        <BackdropReadout />
      </div>
    </>
  );
}

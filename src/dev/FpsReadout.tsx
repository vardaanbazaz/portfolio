import { useEffect, useState } from 'react';
import { Stats } from '@react-three/drei';

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

/** Frame-rate readout, and what the last wheel notch did to the scroll. Loaded only in dev or with ?fps in the URL. */
export default function FpsReadout() {
  const wheel = useWheelReading();
  return (
    <>
      <Stats />
      <output className="wheel-readout" aria-hidden="true">
        {wheel
          ? `wheel deltaY ${wheel.deltaY.toFixed(1)} ${MODES[wheel.deltaMode] ?? wheel.deltaMode} (mode ${wheel.deltaMode})` +
            ` · scrolled ${wheel.px.toFixed(0)} px over ${wheel.events} event${wheel.events === 1 ? '' : 's'}` +
            ` (${(wheel.px / wheel.events).toFixed(0)} px each)` +
            ` · ${((wheel.px / wheel.pathHeight) * 100).toFixed(2)}% of path` +
            ` (${((wheel.px / wheel.events / wheel.pathHeight) * 100).toFixed(2)}% each)`
          : 'wheel: none yet'}
      </output>
    </>
  );
}

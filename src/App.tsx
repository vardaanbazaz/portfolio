import { lazy, Suspense, type CSSProperties } from 'react';
import { SceneRoot } from './scene/SceneRoot';
import { SCROLL_PAGES } from './scene/tuning';

const FpsReadout = lazy(() => import('./dev/FpsReadout'));
const showFps = import.meta.env.DEV || new URLSearchParams(window.location.search).has('fps');

export function App() {
  return (
    <>
      <SceneRoot />
      <div className="scroll-spacer" style={{ '--pages': SCROLL_PAGES } as CSSProperties} />
      {showFps && (
        <Suspense fallback={null}>
          <FpsReadout />
        </Suspense>
      )}
    </>
  );
}

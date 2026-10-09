import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import { AnimatePresence } from 'motion/react';
import { PageView } from './pages/PageView';
import { STOP_PATHS, stopForPath } from './routes';
import { STOP_T } from './scene/cameraPath';
import { focusMarker } from './scene/markerRegistry';
import { SceneRoot } from './scene/SceneRoot';
import { SCROLL_PAGES } from './scene/tuning';
import { MuteToggle } from './sound/MuteToggle';
import { sound } from './sound/sound';
import { STOP_IDS, type StopId } from './stops/contract';
import { appStore, useAppState } from './store';
import { SITE_NAME, STOP_LABELS, UI } from './ui/strings';

const FpsReadout = lazy(() => import('./dev/FpsReadout'));
const showFps = import.meta.env.DEV || new URLSearchParams(window.location.search).has('fps');

const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

/** Locks page scroll whenever the visitor isn't exploring, and puts the scroll position back on unlock. */
function useScrollLock(locked: boolean, bootStop: StopId | null) {
  const saved = useRef(0);
  const booted = useRef(false);

  useLayoutEffect(() => {
    // Direct load of a page URL: there is no earlier position, so return to that stop's point on the path.
    if (!booted.current) {
      booted.current = true;
      if (bootStop) window.scrollTo(0, STOP_T[bootStop] * maxScroll());
    }
    const root = document.documentElement;
    if (locked) {
      saved.current = window.scrollY;
      root.classList.add('scroll-locked');
    } else {
      root.classList.remove('scroll-locked');
      if (window.scrollY !== saved.current) window.scrollTo(0, saved.current);
    }
  }, [locked, bootStop]);
}

function AppShell({ bootStop }: { bootStop: StopId | null }) {
  const { phase, stop, route, returnFocus, sceneHidden } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const closeRequested = useRef(false);

  // The URL is the source of truth: every change (marker, close, Back, Forward) goes through here.
  useEffect(() => {
    appStore.dispatch({ type: 'route', route: stopForPath(location.pathname) });
  }, [location.pathname]);

  useEffect(() => {
    document.title = route ? UI.pageTitle(STOP_LABELS[route]) : SITE_NAME;
  }, [route]);

  useScrollLock(phase !== 'exploring', bootStop);

  useEffect(() => {
    if (phase === 'flyingIn') sound.play('in');
    if (phase === 'flyingOut') sound.play('out');
    if (phase === 'pageOpen') closeRequested.current = false;
    if (phase === 'exploring' && returnFocus) focusMarker(returnFocus);
  }, [phase, returnFocus]);

  // Runs inside the marker or box click, the only gesture that creates the AudioContext.
  const openStop = useCallback(
    (id: StopId) => {
      if (appStore.get().phase !== 'exploring') return;
      sound.unlock();
      navigate(STOP_PATHS[id]);
    },
    [navigate],
  );

  // Opened in-app: go back to `/`. Direct load: there is nothing to go back to, so replace with `/`.
  // Guarded so a repeated Escape can't step back past `/`.
  const closePage = useCallback(() => {
    if (closeRequested.current || appStore.get().phase !== 'pageOpen') return;
    closeRequested.current = true;
    if (location.key === 'default') navigate('/', { replace: true });
    else navigate(-1);
  }, [location.key, navigate]);

  const onPageShown = useCallback(() => appStore.dispatch({ type: 'pageShown' }), []);
  const onPageGone = useCallback(() => appStore.dispatch({ type: 'pageHidden' }), []);

  return (
    <>
      <SceneRoot onOpen={openStop} hidden={sceneHidden} />
      <div className="scroll-spacer" style={{ '--pages': SCROLL_PAGES } as CSSProperties} />
      <Routes>
        <Route path="/" element={null} />
        {STOP_IDS.map((id) => (
          <Route key={id} path={STOP_PATHS[id]} element={null} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* initial={false}: a direct load shows its page at once, with no fade or fly-in. */}
      <AnimatePresence initial={false} onExitComplete={onPageGone}>
        {phase === 'pageOpen' && stop && (
          <PageView key={stop} stop={stop} onBack={closePage} onShown={onPageShown} />
        )}
      </AnimatePresence>
      <MuteToggle />
      {showFps && (
        <Suspense fallback={null}>
          <FpsReadout />
        </Suspense>
      )}
    </>
  );
}

export function App({ bootStop }: { bootStop: StopId | null }) {
  return (
    <BrowserRouter>
      <AppShell bootStop={bootStop} />
    </BrowserRouter>
  );
}

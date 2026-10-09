import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import { AnimatePresence } from 'motion/react';
import { opensPanel, PAGE_IDS } from './pages/contract';
import { PageView } from './pages/PageView';
import { PanelView } from './panels/PanelView';
import { prefetchTarget } from './preload';
import {
  itemForState,
  itemState,
  PAGE_PATHS,
  pageForPath,
  panelForState,
  panelState,
  sectionForHash,
  sectionHash,
} from './routes';
import { nearestSection, scrollProgress, SECTION_T } from './scene/cameraPath';
import { focusMarker } from './scene/markerRegistry';
import { isTravelling, stopTravel, travelTo } from './scene/menuTravel';
import { SceneRoot } from './scene/SceneRoot';
import { SCROLL_PAGES } from './scene/tuning';
import type { MarkerTarget, SectionId } from './sections/contract';
import { returnMarker } from './sections/layouts';
import { MuteToggle } from './sound/MuteToggle';
import { sound } from './sound/sound';
import { appStore, useAppState } from './store';
import { SectionMenu } from './ui/SectionMenu';
import { usePageHead } from './ui/pageHead';

const FpsReadout = lazy(() => import('./dev/FpsReadout'));
const showFps = import.meta.env.DEV || new URLSearchParams(window.location.search).has('fps');

const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

/** Where the menu can send the camera: a section, or the top of the path (the landing view). */
type Destination = SectionId | 'top';

/** While the visitor explores `/`, keeps the hash on the nearest section (none on the landing stretch),
 *  replacing the history entry only when that section changes. A reload then starts there.
 *  Paused during a menu travel; returns the sync, which the travel runs once when it arrives or is cancelled. */
function useHashFollowsScroll() {
  const navigate = useNavigate();
  // navigate changes identity with the pathname; a ref keeps syncHash (and the travel built on it) stable.
  const navigateRef = useRef(navigate);
  useLayoutEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const syncHash = useCallback(() => {
    // window.location, not the router's location: it updates the moment navigate() runs,
    // so a burst of scroll events can't replace the entry twice for one change.
    if (appStore.get().phase !== 'exploring' || window.location.pathname !== '/') return;
    const section = nearestSection(scrollProgress(window.scrollY, maxScroll()));
    if (section === sectionForHash(window.location.hash)) return;
    navigateRef.current({ pathname: '/', hash: section ? sectionHash(section) : '' }, { replace: true });
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (!isTravelling()) syncHash();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [syncHash]);

  return syncHash;
}

/** Locks page scroll whenever the visitor isn't exploring, and puts the scroll position back on unlock. */
function useScrollLock(locked: boolean, bootT: number | null) {
  const saved = useRef(0);
  const booted = useRef(false);

  useLayoutEffect(() => {
    // First load of a page URL or a section hash: start at that section's point on the path.
    if (!booted.current) {
      booted.current = true;
      if (bootT !== null) window.scrollTo(0, bootT * maxScroll());
      // So the unlock branch below doesn't put a section-hash load back at the top.
      saved.current = window.scrollY;
    }
    const root = document.documentElement;
    if (locked) {
      saved.current = window.scrollY;
      root.classList.add('scroll-locked');
    } else {
      root.classList.remove('scroll-locked');
      if (window.scrollY !== saved.current) window.scrollTo(0, saved.current);
    }
  }, [locked, bootT]);
}

interface AppProps {
  bootT: number | null;
  /** The browser lost the scene's WebGL context; the visit moves to the HTML site. */
  onContextLost: () => void;
}

function AppShell({ bootT, onContextLost }: AppProps) {
  const { phase, page, item, panel, route, returnFocus, sceneHidden } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const closeRequested = useRef(false);
  /** Destination chosen in the menu while a page or panel was open or a flight was running; travelled to once exploring. */
  const pendingTravel = useRef<Destination | null>(null);

  // The URL and its history state are the source of truth: every change (marker, close, menu, Back, Forward)
  // goes through here.
  useEffect(() => {
    const route = pageForPath(location.pathname);
    appStore.dispatch({
      type: 'route',
      route,
      item: itemForState(route, location.state),
      panel: panelForState(route, location.state),
    });
  }, [location.pathname, location.state]);

  usePageHead(route);

  // Leaving the path (marker, Back to a page URL) stops a menu travel before the scroll lock saves the position.
  useLayoutEffect(() => {
    if (phase !== 'exploring') stopTravel();
  }, [phase]);

  useScrollLock(phase !== 'exploring', bootT);
  const syncHash = useHashFollowsScroll();

  /** Glides to a destination's point on the path; the hash is set once, on arrival (or where a cancel leaves it). */
  const travel = useCallback(
    (to: Destination) =>
      travelTo(to === 'top' ? 0 : SECTION_T[to] * maxScroll(), maxScroll(), { onArrive: syncHash, onCancel: syncHash }),
    [syncHash],
  );

  // A sweep held for a context that isn't running yet is dropped when its flight ends.
  useEffect(() => {
    if (phase === 'flyingIn') return sound.play('in');
    if (phase === 'flyingOut') return sound.play('out');
  }, [phase]);

  // Start fetching the page's or panel's chunk as the fly-in starts at the latest (hovering, focusing or pressing its
  // marker usually started it already), so it is ready when the fade begins.
  useEffect(() => {
    if (phase !== 'flyingIn' || !page) return;
    prefetchTarget(page, panel ? item : null);
  }, [phase, page, item, panel]);

  useEffect(() => {
    if (phase === 'open') closeRequested.current = false;
    if (phase !== 'exploring') return;
    const destination = pendingTravel.current;
    if (destination) {
      // Runs after useScrollLock has restored the old position, so the travel wins.
      pendingTravel.current = null;
      travel(destination);
    } else {
      // Back on the path where the page or panel was (a direct load's close moves no scroll, so no scroll event
      // syncs it): the hash names that section again, so a reload starts there.
      syncHash();
      if (returnFocus) focusMarker(returnMarker(returnFocus));
    }
  }, [phase, returnFocus, travel, syncHash]);

  // A short item's marker opens its panel: a new history entry at the same URL (query and hash included), with the
  // panel in its state, so Back closes it. Any other marker opens its page at the page's own URL; an item rides in
  // history state, so Forward reopens it.
  const openTarget = useCallback(
    ({ page: id, item }: MarkerTarget) => {
      if (appStore.get().phase !== 'exploring') return;
      const { search, hash } = window.location;
      if (opensPanel(item)) navigate({ pathname: '/', search, hash }, { state: panelState(item) });
      else navigate(PAGE_PATHS[id], { state: itemState(item) });
    },
    [navigate],
  );

  // Opened in-app: go back to the entry before it. With nothing to go back to (a direct load), replace the entry
  // with `/` (for a panel, the same URL without the panel). Guarded so a repeated Escape can't step back further.
  const close = useCallback(() => {
    if (closeRequested.current || appStore.get().phase !== 'open') return;
    closeRequested.current = true;
    if (location.key !== 'default') navigate(-1);
    else navigate(appStore.get().panel ? { pathname: '/', search: location.search, hash: location.hash } : '/', { replace: true });
  }, [location.key, location.search, location.hash, navigate]);

  // On the path: travel there, and the hash follows on arrival. If a page or panel is open (or a flight is running),
  // replace the entry with plain `/` (no history entry added), which closes it; the travel starts once back on the path.
  const goTo = useCallback(
    (to: Destination) => {
      if (appStore.get().phase === 'exploring') {
        travel(to);
        return;
      }
      navigate('/', { replace: true });
      pendingTravel.current = to;
    },
    [navigate, travel],
  );
  const goToTop = useCallback(() => goTo('top'), [goTo]);

  const onShown = useCallback(() => appStore.dispatch({ type: 'shown' }), []);
  const onGone = useCallback(() => appStore.dispatch({ type: 'hidden' }), []);

  return (
    <>
      <SceneRoot onOpen={openTarget} hidden={sceneHidden} onContextLost={onContextLost} />
      <div className="scroll-spacer" style={{ '--pages': SCROLL_PAGES } as CSSProperties} />
      <Routes>
        <Route path="/" element={null} />
        {PAGE_IDS.map((id) => (
          <Route key={id} path={PAGE_PATHS[id]} element={null} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* initial={false}: a direct load shows its page at once, with no fade or fly-in. */}
      <AnimatePresence initial={false} onExitComplete={onGone}>
        {phase === 'open' &&
          page &&
          (panel && opensPanel(item) ? (
            <PanelView key={`panel-${item}`} item={item} onClose={close} />
          ) : (
            <PageView key={page} page={page} item={item} onBack={close} onShown={onShown} />
          ))}
      </AnimatePresence>
      <SectionMenu onSelect={goTo} onTop={goToTop} />
      <MuteToggle />
      {showFps && (
        <Suspense fallback={null}>
          <FpsReadout />
        </Suspense>
      )}
    </>
  );
}

export function App({ bootT, onContextLost }: AppProps) {
  return (
    <BrowserRouter>
      <AppShell bootT={bootT} onContextLost={onContextLost} />
    </BrowserRouter>
  );
}

import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import { AnimatePresence } from 'motion/react';
import { PAGE_LABELS, SITE_NAME } from './content/scene';
import { PAGE_IDS, type PageId } from './pages/contract';
import { PageView } from './pages/PageView';
import { pageLoaders } from './pages/registry';
import { PAGE_PATHS, pageForPath, sectionForHash, sectionHash } from './routes';
import { nearestSection, scrollProgress, SECTION_T } from './scene/cameraPath';
import { focusMarker } from './scene/markerRegistry';
import { isTravelling, stopTravel, travelTo } from './scene/menuTravel';
import { SceneRoot } from './scene/SceneRoot';
import { SCROLL_PAGES } from './scene/tuning';
import type { SectionId } from './sections/contract';
import { MuteToggle } from './sound/MuteToggle';
import { sound } from './sound/sound';
import { appStore, useAppState } from './store';
import { SectionMenu } from './ui/SectionMenu';
import { UI } from './ui/strings';

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

function AppShell({ bootT }: { bootT: number | null }) {
  const { phase, page, route, returnFocus, sceneHidden } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const closeRequested = useRef(false);
  /** Destination chosen in the menu while a page was open or a flight was running; travelled to once exploring. */
  const pendingTravel = useRef<Destination | null>(null);

  // The URL is the source of truth: every change (marker, close, menu, Back, Forward) goes through here.
  useEffect(() => {
    appStore.dispatch({ type: 'route', route: pageForPath(location.pathname) });
  }, [location.pathname]);

  useEffect(() => {
    document.title = route ? UI.pageTitle(PAGE_LABELS[route]) : SITE_NAME;
  }, [route]);

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

  // Start fetching the page's chunk as the fly-in starts, so it is usually ready when the fade begins.
  useEffect(() => {
    if (phase === 'flyingIn' && page) void pageLoaders[page]();
  }, [phase, page]);

  useEffect(() => {
    if (phase === 'pageOpen') closeRequested.current = false;
    if (phase !== 'exploring') return;
    const destination = pendingTravel.current;
    if (destination) {
      // Runs after useScrollLock has restored the old position, so the travel wins.
      pendingTravel.current = null;
      travel(destination);
    } else if (returnFocus) {
      focusMarker(returnFocus);
    }
  }, [phase, returnFocus, travel]);

  const openPage = useCallback(
    (id: PageId) => {
      if (appStore.get().phase !== 'exploring') return;
      navigate(PAGE_PATHS[id]);
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

  // On the path: travel there, and the hash follows on arrival. If a page is open (or a flight is running),
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

  const onPageShown = useCallback(() => appStore.dispatch({ type: 'pageShown' }), []);
  const onPageGone = useCallback(() => appStore.dispatch({ type: 'pageHidden' }), []);

  return (
    <>
      <SceneRoot onOpen={openPage} hidden={sceneHidden} />
      <div className="scroll-spacer" style={{ '--pages': SCROLL_PAGES } as CSSProperties} />
      <Routes>
        <Route path="/" element={null} />
        {PAGE_IDS.map((id) => (
          <Route key={id} path={PAGE_PATHS[id]} element={null} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* initial={false}: a direct load shows its page at once, with no fade or fly-in. */}
      <AnimatePresence initial={false} onExitComplete={onPageGone}>
        {phase === 'pageOpen' && page && (
          <PageView key={page} page={page} onBack={closePage} onShown={onPageShown} />
        )}
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

export function App({ bootT }: { bootT: number | null }) {
  return (
    <BrowserRouter>
      <AppShell bootT={bootT} />
    </BrowserRouter>
  );
}

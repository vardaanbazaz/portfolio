import { StrictMode } from 'react';
import type { Root } from 'react-dom/client';
import { App } from './App';
import { listenVisibility, preloadPosters, releaseBackdrops } from './environment/backdropPlayer';
import { BACKDROPS } from './environment/backdrops';
import { preloadAll, SCENE_CHUNK_LOADS } from './preload';
import { pageForPath, sectionForHash } from './routes';
import { SECTION_T } from './scene/cameraPath';
import { PAGE_SECTION } from './sections/layouts';
import { browserStorage, readMuted, sound } from './sound/sound';
import { appStore } from './store';
import { chunkArrived, onLifted, sceneCodeLoaded } from './ui/loadingScreen';

/** The scene site. Loaded only once the capability check passes, so everything 3D sits behind this import.
 *  `pressedEarly`: the visitor pressed while this code was on its way. */
export function mountScene(root: Root, onContextLost: () => void, pressedEarly = false) {
  // Scroll position is managed by the app (scroll lock, restore and section travel), not the browser.
  history.scrollRestoration = 'manual';

  const bootPage = pageForPath(window.location.pathname);
  // The loading screen's first step; on a direct page link it waits for that page rather than the whole scene.
  sceneCodeLoaded(SCENE_CHUNK_LOADS.length, BACKDROPS.length, bootPage !== null);
  // Each backdrop's poster is a step. Its video loads only once the screen has lifted, and its sound only after a
  // press, so neither holds the screen up.
  preloadPosters(chunkArrived);
  onLifted(releaseBackdrops);
  // Every page and panel, fetched from now on in the background.
  preloadAll(chunkArrived);
  listenVisibility(document);
  const bootSection = bootPage ? PAGE_SECTION[bootPage] : sectionForHash(window.location.hash);
  appStore.dispatch({ type: 'boot', route: bootPage });
  // Sound is on unless the visitor muted before. The first pointer or key press anywhere creates the AudioContext,
  // at once if it came before this code did.
  sound.init(readMuted(browserStorage()));
  sound.listen(window, document, pressedEarly);

  // The scene can't go on without its context: hand the visit to the HTML site, with no sound and the page unlocked.
  let left = false;
  const leave = () => {
    if (left) return;
    left = true;
    sound.dispose();
    document.documentElement.classList.remove('scroll-locked');
    history.scrollRestoration = 'auto';
    onContextLost();
  };

  root.render(
    <StrictMode>
      {/* A page URL starts at its section; `/#section` starts at that section; plain `/` at the landing view. */}
      <App bootT={bootSection ? SECTION_T[bootSection] : null} onContextLost={leave} />
    </StrictMode>,
  );
}

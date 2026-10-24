import { StrictMode } from 'react';
import type { Root } from 'react-dom/client';
import { App } from './App';
import { BACKDROP_IMAGE_COUNT, listenInput, listenVisibility, loadWorlds, preloadImages, releaseBackdrops } from './environment/backdropPlayer';
import { preloadAll, SCENE_CHUNK_LOADS } from './preload';
import { pageForPath, sectionForHash } from './routes';
import { SECTION_T } from './scene/cameraPath';
import { PAGE_SECTION } from './sections/layouts';
import { browserStorage, readMuted, sound } from './sound/sound';
import { appStore } from './store';
import { chunkArrived, gateEntry, onLifted, sceneCodeLoaded } from './ui/loadingScreen';

/** The scene site. Loaded only once the capability check passes, so everything 3D sits behind this import.
 *  `pressedEarly`: the visitor pressed while this code was on its way; only a direct page link uses it, since
 *  anywhere else the entry gate's press starts sound. */
export function mountScene(root: Root, onContextLost: () => void, pressedEarly = false) {
  // Scroll position is managed by the app (scroll lock, restore and section travel), not the browser.
  history.scrollRestoration = 'manual';

  const bootPage = pageForPath(window.location.pathname);
  // The loading screen's first step; on a direct page link it waits for that page rather than the whole scene.
  sceneCodeLoaded(SCENE_CHUNK_LOADS.length, BACKDROP_IMAGE_COUNT, bootPage !== null);
  // Each of the landing's images is a step, done once it has decoded. Its sound loads only after a press, so it never
  // holds the screen up. Every other world's images load once the visitor is in, one world at a time in path order.
  preloadImages(chunkArrived);
  onLifted(() => {
    releaseBackdrops();
    void loadWorlds();
  });
  // Every page and panel, fetched from now on in the background.
  preloadAll(chunkArrived);
  listenVisibility(document);
  listenInput(window);
  const bootSection = bootPage ? PAGE_SECTION[bootPage] : sectionForHash(window.location.hash);
  appStore.dispatch({ type: 'boot', route: bootPage });
  // Sound is on unless the visitor muted before.
  sound.init(readMuted(browserStorage()));
  if (bootPage) {
    // A direct page link has no entry gate: the first pointer or key press anywhere creates the AudioContext, at once
    // if it came before this code did.
    sound.listen(window, document, pressedEarly);
  } else {
    // The loading screen ends on the entry gate. Nothing listens for presses until the visitor passes it, so Enter
    // without sound can't start a context on its way. Enter turns mute off first (unlocking does nothing while muted),
    // then unlocks inside its own press.
    gateEntry({
      savedMuted: sound.muted,
      onEnter: (withSound) => {
        sound.setMuted(!withSound);
        sound.listen(window, document, withSound);
      },
    });
  }

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

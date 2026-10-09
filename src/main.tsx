import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { pageForPath, sectionForHash } from './routes';
import { SECTION_T } from './scene/cameraPath';
import { PAGE_SECTION } from './sections/layouts';
import { browserStorage, readMuted, sound } from './sound/sound';
import { appStore } from './store';
import './index.css';

// Scroll position is managed by the app (scroll lock, restore and section travel), not the browser.
history.scrollRestoration = 'manual';

const bootPage = pageForPath(window.location.pathname);
const bootSection = bootPage ? PAGE_SECTION[bootPage] : sectionForHash(window.location.hash);
appStore.dispatch({ type: 'boot', route: bootPage });
// Sound is on unless the visitor muted before. The first pointer or key press anywhere creates the AudioContext.
sound.init(readMuted(browserStorage()));
sound.listen(window, document);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* A page URL starts at its section; `/#section` starts at that section; plain `/` at the landing view. */}
    <App bootT={bootSection ? SECTION_T[bootSection] : null} />
  </StrictMode>,
);

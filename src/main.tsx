import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { stopForPath } from './routes';
import { browserStorage, readMuted, sound } from './sound/sound';
import { appStore } from './store';
import './index.css';

// Scroll position is managed by the app (scroll lock and restore), not the browser.
history.scrollRestoration = 'manual';

const bootStop = stopForPath(window.location.pathname);
appStore.dispatch({ type: 'boot', route: bootStop });
// Sound is on unless the visitor muted before. The first pointer or key press anywhere creates the AudioContext.
sound.init(readMuted(browserStorage()));
sound.listen(window, document);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App bootStop={bootStop} />
  </StrictMode>,
);

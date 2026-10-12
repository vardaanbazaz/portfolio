import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { sceneSupported } from './fallback/capability';
import './index.css';

// Nothing 3D is imported here: the scene and the HTML site are each their own chunk, and a visit fetches one.
const root = createRoot(document.getElementById('root')!);

function showFallback() {
  void import('./fallback/FallbackApp').then(({ FallbackApp }) =>
    root.render(
      <StrictMode>
        <FallbackApp />
      </StrictMode>,
    ),
  );
}

if (sceneSupported(window)) {
  // On a direct page link, a press while the scene's code is still on its way (the loading screen is up) is the
  // visitor's first press, and starts sound once that code arrives. Elsewhere the entry gate starts sound instead. The same presses as `GESTURE_EVENTS` in src/sound/sound.ts, which takes
  // over from here.
  let pressed = false;
  const presses = ['pointerdown', 'pointerup', 'click', 'keydown'] as const;
  const notePress = () => {
    pressed = true;
  };
  for (const type of presses) window.addEventListener(type, notePress, { capture: true, passive: true });
  const mount = ({ mountScene }: typeof import('./sceneMain')) => {
    for (const type of presses) window.removeEventListener(type, notePress, { capture: true });
    mountScene(root, showFallback, pressed);
  };
  import('./sceneMain').then(mount, showFallback);
} else {
  showFallback();
}

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
  import('./sceneMain').then(({ mountScene }) => mountScene(root, showFallback), showFallback);
} else {
  showFallback();
}

import { useSyncExternalStore } from 'react';
import { UI } from '../ui/strings';
import { sound } from './sound';

const getMuted = () => sound.muted;

/** Fixed corner toggle, shown on every screen including over pages. */
export function MuteToggle() {
  const muted = useSyncExternalStore(sound.subscribe, getMuted);
  return (
    <button type="button" className="mute-toggle" aria-pressed={muted} onClick={() => sound.setMuted(!muted)}>
      {UI.mute}
    </button>
  );
}

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import type { StopId } from '../stops/contract';
import { OVERLAY_SECONDS } from '../scene/tuning';
import { UI } from '../ui/strings';
import { pages } from './registry';

interface PageOverlayProps {
  stop: StopId;
  onClose: () => void;
}

/** Dialog shell over the scene. Its own scroll container, so reading a page never moves the scene. */
export function PageOverlay({ stop, onClose }: PageOverlayProps) {
  const panel = useRef<HTMLDivElement>(null);
  const Page = pages[stop];
  const headingId = `page-title-${stop}`;

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('h1')?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: OVERLAY_SECONDS }}
    >
      <div ref={panel} className="overlay-panel" role="dialog" aria-modal="true" aria-labelledby={headingId}>
        <button type="button" className="overlay-close" onClick={onClose}>
          {UI.close}
        </button>
        <Page headingId={headingId} />
      </div>
    </motion.div>
  );
}

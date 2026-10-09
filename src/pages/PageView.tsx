import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import type { StopId } from '../stops/contract';
import { PAGE_FADE_SECONDS } from '../scene/tuning';
import { UI } from '../ui/strings';
import { pages } from './registry';

interface PageViewProps {
  stop: StopId;
  onBack: () => void;
  /** The fade-in finished and the page now covers the whole viewport. */
  onShown: () => void;
}

/** A stop's page: an opaque full-viewport view that scrolls on its own, so reading never moves the scene. */
export function PageView({ stop, onBack, onShown }: PageViewProps) {
  const root = useRef<HTMLElement>(null);
  const Page = pages[stop];
  const headingId = `page-title-${stop}`;

  useEffect(() => {
    root.current?.querySelector<HTMLElement>('h1')?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onBack]);

  return (
    <motion.main
      ref={root}
      className="page"
      aria-labelledby={headingId}
      variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }}
      initial="hidden"
      animate="shown"
      exit="hidden"
      transition={{ duration: PAGE_FADE_SECONDS }}
      onAnimationComplete={(name) => name === 'shown' && onShown()}
    >
      <button type="button" className="page-back" onClick={onBack}>
        {UI.back}
      </button>
      <div className="page-column">
        <Page headingId={headingId} />
      </div>
    </motion.main>
  );
}

import { Suspense, useEffect, useRef, type RefObject } from 'react';
import { motion } from 'motion/react';
import { PAGE_FADE_SECONDS } from '../scene/tuning';
import { UI } from '../ui/strings';
import type { PageId } from './contract';
import { pages } from './registry';

interface PageViewProps {
  page: PageId;
  onBack: () => void;
  /** The fade-in finished and the page now covers the whole viewport. */
  onShown: () => void;
}

/** Focuses the page h1 once the page's chunk has loaded and rendered (it mounts together with the page). */
function FocusHeading({ root }: { root: RefObject<HTMLElement | null> }) {
  useEffect(() => {
    root.current?.querySelector<HTMLElement>('h1')?.focus();
  }, [root]);
  return null;
}

/** A page: an opaque full-viewport view that scrolls on its own, so reading never moves the scene.
 *  The page's code and content load the first time it opens. */
export function PageView({ page, onBack, onShown }: PageViewProps) {
  const root = useRef<HTMLElement>(null);
  const Page = pages[page];
  const headingId = `page-title-${page}`;

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
        <Suspense
          fallback={
            <p className="page-loading" role="status">
              {UI.loading}
            </p>
          }
        >
          <Page headingId={headingId} />
          <FocusHeading root={root} />
        </Suspense>
      </div>
    </motion.main>
  );
}

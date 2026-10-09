import { Suspense, useCallback, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { panelHeadingId, type PanelItemId } from '../pages/contract';
import { registerLeader, registerPanel } from '../scene/panelRegistry';
import { PAGE_FADE_SECONDS } from '../scene/tuning';
import { UI } from '../ui/strings';
import { panels } from './registry';

/** Controls a press on which doesn't count as outside the panel: the menu closes the panel its own way,
 *  and muting leaves it open. */
const NOT_OUTSIDE = '.menu, .mute-toggle';

interface PanelViewProps {
  item: PanelItemId;
  onClose: () => void;
}

/** Focuses the panel's heading once its chunk has loaded and rendered (it mounts together with the content). */
function FocusHeading({ id }: { id: string }) {
  useEffect(() => {
    document.getElementById(id)?.focus();
  }, [id]);
  return null;
}

/**
 * An item's panel: translucent, beside its box in the scene, joined to it by a leader line (placed every frame by
 * PanelLeaderTracker). The scene keeps drawing around it. Close, Escape or a press anywhere outside it closes it.
 * Mounted only once the camera has arrived, so the press that opened it can't close it.
 */
export function PanelView({ item, onClose }: PanelViewProps) {
  const panel = useRef<HTMLElement>(null);
  const Panel = panels[item];
  const headingId = panelHeadingId(item);

  const panelRef = useCallback((el: HTMLElement | null) => {
    panel.current = el;
    registerPanel(el);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Element) || panel.current?.contains(target) || target.closest(NOT_OUTSIDE)) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [onClose]);

  return (
    <motion.div
      className="panel-layer"
      variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }}
      initial="hidden"
      animate="shown"
      exit="hidden"
      transition={{ duration: PAGE_FADE_SECONDS }}
    >
      <svg className="panel-leader" aria-hidden="true">
        <line ref={registerLeader} />
      </svg>
      <section ref={panelRef} className="panel" role="dialog" aria-labelledby={headingId}>
        <button type="button" className="panel-close" onClick={onClose}>
          {UI.close}
        </button>
        <Suspense
          fallback={
            <p className="page-loading" role="status">
              {UI.loading}
            </p>
          }
        >
          <Panel item={item} headingId={headingId} />
          <FocusHeading id={headingId} />
        </Suspense>
      </section>
    </motion.div>
  );
}

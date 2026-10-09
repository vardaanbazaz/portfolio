import { Component, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { LazyChunk } from './chunk';
import { contentShown } from './loadingScreen';
import { UI } from './strings';

/** A load faster than this shows no "Loading" line, so it can't flash. */
const LOADING_DELAY_MS = 300;

function DelayedLoading() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), LOADING_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  return shown ? (
    <p className="page-loading" role="status">
      {UI.loading}
    </p>
  ) : null;
}

interface LoadFailedProps {
  onRetry: () => void;
  /** Try again was pressed and the chunk is being fetched. */
  retrying: boolean;
}

/** Tells the loading screen the view has something to show. A layout effect, so on a direct page link the screen
 *  lifts (and `inert` clears) before any effect moves focus into the view. */
function Shown() {
  useLayoutEffect(contentShown, []);
  return null;
}

function LoadFailed({ onRetry, retrying }: LoadFailedProps) {
  useLayoutEffect(contentShown, []);
  const button = useRef<HTMLButtonElement>(null);
  // Focus moves here as it would to the content's heading, so a keyboard visitor lands on the way out.
  useEffect(() => button.current?.focus(), []);
  return (
    <div role="alert">
      <p>{UI.loadFailed}</p>
      {/* aria-disabled, not disabled: a disabled button would drop focus to the body while the fetch runs. */}
      <button ref={button} type="button" onClick={() => !retrying && onRetry()} aria-disabled={retrying}>
        {UI.tryAgain}
      </button>
      {retrying && <DelayedLoading />}
    </div>
  );
}

interface BoundaryProps extends LoadFailedProps {
  children: ReactNode;
}

class LoadBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    const { onRetry, retrying, children } = this.props;
    return this.state.failed ? <LoadFailed onRetry={onRetry} retrying={retrying} /> : children;
  }
}

interface ChunkViewProps<P> {
  chunk: LazyChunk<P>;
  props: P;
  /** Rendered after the content, once it has loaded (a focus effect, say). */
  after?: ReactNode;
}

/**
 * Renders a page's or panel's chunk. "Loading" shows only if the wait is long; a chunk that still fails after its
 * retries shows a message with a button that fetches it again. If that fails too, the button reloads the document:
 * a script the browser failed to fetch for a chunk's import can stay failed for the rest of the visit, and only a
 * reload clears it. The URL brings the visitor back to the same page (offline, a reload would only show the
 * browser's error page, so the message stays).
 */
export function ChunkView<P extends object>({ chunk, props, after }: ChunkViewProps<P>) {
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const retry = () => {
    setRetrying(true);
    chunk.load().then(
      () => {
        chunk.retry();
        setRetrying(false);
        setAttempt((n) => n + 1);
      },
      () => {
        if (!mounted.current) return;
        if (navigator.onLine === false) setRetrying(false);
        else window.location.reload();
      },
    );
  };
  const Content = chunk.Component;
  return (
    <LoadBoundary key={attempt} onRetry={retry} retrying={retrying}>
      <Suspense fallback={<DelayedLoading />}>
        <Content {...props} />
        <Shown />
        {after}
      </Suspense>
    </LoadBoundary>
  );
}

import { useEffect, useRef, useState } from 'react';
import { PauseMenu } from '../components/PauseMenu';

interface IframeGameProps {
  src: string;
  onExit: () => void;
}

/**
 * Wraps a bundled third-party static game (loaded from public/oss-games/*)
 * in an iframe. Escape-to-pause is best-effort here: once the iframe has
 * focus, keydowns fire on its own document, not ours, so we try attaching a
 * listener inside it (works when same-origin) and always show a visible
 * pause/exit bar so the feature works regardless of focus.
 */
export function IframeGame({ src, onExit }: IframeGameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const attach = () => {
      try {
        iframe.contentWindow?.addEventListener(
          'keydown',
          (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setPaused((p) => !p);
            }
          },
          { capture: true },
        );
      } catch {
        /* cross-origin iframe — the visible pause button still works */
      }
    };
    iframe.addEventListener('load', attach);
    return () => iframe.removeEventListener('load', attach);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black px-4 py-2">
        <button
          onClick={onExit}
          className="rounded border border-white/20 px-3 py-1.5 text-xs text-white/60 hover:border-white/40 hover:text-white"
        >
          ← Store
        </button>
        <button
          onClick={() => setPaused(true)}
          className="rounded border border-white/20 px-3 py-1.5 text-xs text-white/60 hover:border-white/40 hover:text-white"
        >
          ⏸ Pause
        </button>
      </div>
      <iframe
        ref={iframeRef}
        src={src}
        title={src}
        className="flex-1 border-0"
        style={{ pointerEvents: paused ? 'none' : 'auto' }}
      />
      {paused && <PauseMenu onResume={() => setPaused(false)} onExit={onExit} />}
    </div>
  );
}

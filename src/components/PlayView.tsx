import { useEffect, useState } from 'react';
import { PLAYABLE_GAMES } from '../games';
import { IframeGame } from '../games/IframeGame';
import { useStore } from '../lib/store';
import { PauseMenu } from './PauseMenu';
import { GameErrorBoundary } from './GameErrorBoundary';

interface PlayViewProps {
  gameId: string;
  onExit: () => void;
}

export function PlayView({ gameId, onExit }: PlayViewProps) {
  const [paused, setPaused] = useState(false);
  const { uploadedGames } = useStore();
  const Game = PLAYABLE_GAMES[gameId];
  const upload = !Game ? uploadedGames.find((g) => g.id === gameId && g.status === 'approved') : undefined;

  useEffect(() => {
    setPaused(false);
  }, [gameId]);

  useEffect(() => {
    // Capture phase runs before each game's own window listeners, regardless
    // of mount order, so this can both toggle pause on Escape and swallow
    // every other key while paused (so a paused game can't take input).
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setPaused((p) => !p);
        return;
      }
      if (paused) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [paused]);

  if (!Game && !upload) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black">
      <div style={{ height: '100%', pointerEvents: paused ? 'none' : 'auto' }}>
        <GameErrorBoundary key={gameId} onExit={onExit}>
          {Game ? <Game onExit={onExit} paused={paused} /> : <IframeGame src={upload!.entryUrl} onExit={onExit} />}
        </GameErrorBoundary>
      </div>
      {paused && <PauseMenu onResume={() => setPaused(false)} onExit={onExit} />}
    </div>
  );
}

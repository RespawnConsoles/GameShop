import { PLAYABLE_GAMES } from '../games';

interface PlayViewProps {
  gameId: string;
  onExit: () => void;
}

export function PlayView({ gameId, onExit }: PlayViewProps) {
  const Game = PLAYABLE_GAMES[gameId];
  if (!Game) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black">
      <Game onExit={onExit} />
    </div>
  );
}

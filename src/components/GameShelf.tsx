import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CatalogGame } from '../lib/catalog';
import { GameCard } from './GameCard';

interface GameShelfProps {
  title: string;
  games: CatalogGame[];
  onOpen: (game: CatalogGame) => void;
}

export function GameShelf({ title, games, onOpen }: GameShelfProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: dir * 620, behavior: 'smooth' });
  };

  if (games.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <div className="flex gap-1.5">
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="rounded-md border border-white/10 p-1.5 text-white/60 hover:bg-white/5 hover:text-white"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="rounded-md border border-white/10 p-1.5 text-white/60 hover:bg-white/5 hover:text-white"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div ref={scrollerRef} className="flex gap-4 overflow-x-auto scroll-smooth pb-2">
        {games.map((game) => (
          <div key={game.id} className="w-56 shrink-0">
            <GameCard game={game} onOpen={onOpen} />
          </div>
        ))}
      </div>
    </div>
  );
}

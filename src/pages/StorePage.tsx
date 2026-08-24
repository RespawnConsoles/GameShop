import { useMemo, useState } from 'react';
import type { CatalogGame } from '../lib/catalog';
import { CATALOG } from '../lib/catalog';
import { GameCard } from '../components/GameCard';

const GROUPS = ['All', ...Array.from(new Set(CATALOG.map((g) => g.group)))];

interface StorePageProps {
  search: string;
  onOpen: (game: CatalogGame) => void;
}

export function StorePage({ search, onOpen }: StorePageProps) {
  const [group, setGroup] = useState('All');

  const games = useMemo(() => {
    const query = search.trim().toLowerCase();
    return CATALOG.filter((g) => {
      const matchesGroup = group === 'All' || g.group === group;
      const matchesSearch = !query || g.title.toLowerCase().includes(query) || g.genre.toLowerCase().includes(query);
      return matchesGroup && matchesSearch;
    });
  }, [search, group]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-5 flex items-center gap-3">
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none"
        >
          {GROUPS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {games.length === 0 ? (
        <p className="text-sm text-white/40">No games found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {games.map((game) => (
            <GameCard key={game.id} game={game} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

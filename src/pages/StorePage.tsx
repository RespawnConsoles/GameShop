import { useEffect, useState } from 'react';
import type { Genre, RawgGame } from '../lib/types';
import { fetchGames, fetchGenres, hasApiKey } from '../lib/rawg';
import { GameCard } from '../components/GameCard';
import { ApiKeyNotice } from '../components/ApiKeyNotice';

const ORDERINGS = [
  { value: '-added', label: 'Popular' },
  { value: '-rating', label: 'Top Rated' },
  { value: '-released', label: 'New Releases' },
  { value: 'name', label: 'Name (A-Z)' },
];

interface StorePageProps {
  search: string;
  onOpen: (game: RawgGame) => void;
}

export function StorePage({ search, onOpen }: StorePageProps) {
  const [games, setGames] = useState<RawgGame[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genre, setGenre] = useState('');
  const [ordering, setOrdering] = useState(ORDERINGS[0].value);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasApiKey()) {
      setLoading(false);
      return;
    }
    fetchGenres()
      .then(setGenres)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!hasApiKey()) return;
    setLoading(true);
    setError(null);
    const timeout = setTimeout(() => {
      fetchGames({ search: search || undefined, genres: genre || undefined, ordering })
        .then(setGames)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, genre, ordering]);

  if (!hasApiKey()) return <ApiKeyNotice />;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-5 flex items-center gap-3">
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none"
        >
          <option value="">All Genres</option>
          {genres.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          value={ordering}
          onChange={(e) => setOrdering(e.target.value)}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none"
        >
          {ORDERINGS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-rose-400">Failed to load games: {error}</p>}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[16/9] animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      ) : games.length === 0 ? (
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

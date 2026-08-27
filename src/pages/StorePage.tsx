import { useMemo } from 'react';
import type { CatalogGame } from '../lib/catalog';
import { CATALOG, uploadedGameToCatalogGame } from '../lib/catalog';
import { useStore } from '../lib/store';
import { GameCard } from '../components/GameCard';
import { HeroCarousel } from '../components/HeroCarousel';
import { GameShelf } from '../components/GameShelf';

const GROUPS = Array.from(new Set(CATALOG.map((g) => g.group)));

interface StorePageProps {
  search: string;
  onOpen: (game: CatalogGame) => void;
}

export function StorePage({ search, onOpen }: StorePageProps) {
  const { account, uploadedGames } = useStore();
  const query = search.trim().toLowerCase();

  const published = useMemo((): CatalogGame[] => {
    if (!account) return CATALOG;
    const approved = uploadedGames
      .filter((g) => g.status === 'approved')
      .map((g) => {
        const studio = account.studios.find((s) => s.id === g.studioId);
        return uploadedGameToCatalogGame(g, studio?.name ?? 'Unknown Studio');
      });
    return [...CATALOG, ...approved];
  }, [account, uploadedGames]);

  const groups = useMemo(
    () => (published.some((g) => g.group === 'Community') ? [...GROUPS, 'Community'] : GROUPS),
    [published],
  );

  const searchResults = useMemo(() => {
    if (!query) return null;
    return published.filter(
      (g) => g.title.toLowerCase().includes(query) || g.genre.toLowerCase().includes(query),
    );
  }, [query, published]);

  if (searchResults) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="mb-4 text-sm text-white/50">
          {searchResults.length} result{searchResults.length === 1 ? '' : 's'} for &ldquo;{search}&rdquo;
        </h2>
        {searchResults.length === 0 ? (
          <p className="text-sm text-white/40">No games found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {searchResults.map((game) => (
              <GameCard key={game.id} game={game} onOpen={onOpen} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <HeroCarousel games={CATALOG} onOpen={onOpen} />
      {groups.map((group) => (
        <GameShelf key={group} title={group} games={published.filter((g) => g.group === group)} onOpen={onOpen} />
      ))}
    </div>
  );
}

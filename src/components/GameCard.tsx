import { Heart, Check } from 'lucide-react';
import type { CatalogGame } from '../lib/catalog';
import { useStore } from '../lib/store';

interface GameCardProps {
  game: CatalogGame;
  onOpen: (game: CatalogGame) => void;
}

export function GameCard({ game, onOpen }: GameCardProps) {
  const { owns, isWishlisted, toggleWishlist } = useStore();
  const owned = owns(game.id);
  const wishlisted = isWishlisted(game.id);

  return (
    <div
      onClick={() => onOpen(game)}
      className="group cursor-pointer overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] transition hover:border-white/15 hover:bg-white/[0.06]"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-black/40">
        <img
          src={game.image}
          alt={game.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist({ id: game.id, name: game.title, image: game.image });
          }}
          className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 backdrop-blur transition hover:bg-black/70"
          aria-label="Toggle wishlist"
        >
          <Heart size={14} className={wishlisted ? 'fill-rose-500 text-rose-500' : 'text-white/80'} />
        </button>
        {owned && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded bg-emerald-600/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
            <Check size={11} /> Owned
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-medium text-white/90">{game.title}</h3>
        <div className="mt-1 flex items-center justify-between">
          <span className="truncate text-xs text-white/40">{game.genre}</span>
          <span className="shrink-0 text-sm font-semibold text-emerald-400">
            {owned ? '' : game.price === 0 ? 'FREE' : `$${game.price.toFixed(2)}`}
          </span>
        </div>
      </div>
    </div>
  );
}

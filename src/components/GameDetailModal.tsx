import { useState } from 'react';
import { Heart, X } from 'lucide-react';
import type { CatalogGame } from '../lib/catalog';
import { mockPrice } from '../lib/pricing';
import { useStore } from '../lib/store';

interface GameDetailModalProps {
  game: CatalogGame;
  onClose: () => void;
  onPurchased: (name: string) => void;
}

export function GameDetailModal({ game, onClose, onPurchased }: GameDetailModalProps) {
  const { owns, isWishlisted, toggleWishlist, buy } = useStore();
  const [error, setError] = useState<string | null>(null);

  const price = mockPrice(game.id);
  const owned = owns(game.id);
  const wishlisted = isWishlisted(game.id);

  const handleBuy = () => {
    const result = buy({
      id: game.id,
      name: game.title,
      image: game.image,
      price,
      purchasedAt: new Date().toISOString(),
    });
    if (result.ok) {
      onPurchased(game.title);
    } else {
      setError(result.reason ?? 'Purchase failed');
      setTimeout(() => setError(null), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-[#15161c] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[16/8] w-full bg-black/40">
          <img src={game.image} alt={game.title} className="h-full w-full object-cover" />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 hover:bg-black/80"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#15161c] to-transparent p-4 pt-10">
            <h2 className="text-xl font-semibold text-white">{game.title}</h2>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
            <span>{game.maker}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span
              className="rounded-full px-2.5 py-0.5 text-xs text-white"
              style={{ background: `${game.color}33`, color: game.color }}
            >
              {game.genre}
            </span>
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/60">{game.group}</span>
          </div>

          <p className="text-sm leading-relaxed text-white/60">{game.description}</p>

          <div className="flex items-center gap-3 border-t border-white/10 pt-4">
            {owned ? (
              <span className="rounded-md bg-emerald-600/20 px-4 py-2 text-sm font-medium text-emerald-400">
                In your library
              </span>
            ) : (
              <button
                onClick={handleBuy}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Buy — ${price.toFixed(2)}
              </button>
            )}
            <button
              onClick={() => toggleWishlist({ id: game.id, name: game.title, image: game.image })}
              className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/5"
            >
              <Heart size={14} className={wishlisted ? 'fill-rose-500 text-rose-500' : ''} />
              {wishlisted ? 'Wishlisted' : 'Wishlist'}
            </button>
            {error && <span className="text-xs text-rose-400">{error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Heart, Star, X } from 'lucide-react';
import type { RawgGame } from '../lib/types';
import { mockPrice } from '../lib/pricing';
import { useStore } from '../lib/store';
import { fetchGameDetail } from '../lib/rawg';

interface GameDetailModalProps {
  game: RawgGame;
  onClose: () => void;
  onPurchased: (name: string) => void;
}

export function GameDetailModal({ game, onClose, onPurchased }: GameDetailModalProps) {
  const { owns, isWishlisted, toggleWishlist, buy } = useStore();
  const [detail, setDetail] = useState<RawgGame>(game);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchGameDetail(game.id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        /* fall back to summary data already shown */
      });
    return () => {
      cancelled = true;
    };
  }, [game.id]);

  const price = mockPrice(game.id, game.rating);
  const owned = owns(game.id);
  const wishlisted = isWishlisted(game.id);

  const handleBuy = () => {
    const result = buy({
      id: game.id,
      name: game.name,
      image: game.background_image,
      price,
      purchasedAt: new Date().toISOString(),
    });
    if (result.ok) {
      onPurchased(game.name);
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
          {detail.background_image && (
            <img src={detail.background_image} alt={detail.name} className="h-full w-full object-cover" />
          )}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 hover:bg-black/80"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#15161c] to-transparent p-4 pt-10">
            <h2 className="text-xl font-semibold text-white">{detail.name}</h2>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
            {detail.released && <span>{detail.released}</span>}
            {detail.rating > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <Star size={12} className="fill-amber-400" /> {detail.rating.toFixed(1)}
              </span>
            )}
            {detail.metacritic && <span>Metacritic {detail.metacritic}</span>}
          </div>

          {detail.genres?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {detail.genres.map((g) => (
                <span key={g.id} className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/60">
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {detail.description_raw && (
            <p className="max-h-40 overflow-y-auto text-sm leading-relaxed text-white/60">
              {detail.description_raw}
            </p>
          )}

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
              onClick={() => toggleWishlist({ id: game.id, name: game.name, image: game.background_image })}
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

import { Heart, X } from 'lucide-react';
import { useStore } from '../lib/store';

export function WishlistPage() {
  const { wishlist, toggleWishlist } = useStore();

  if (wishlist.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
        <Heart size={32} className="text-white/20" />
        <h2 className="text-lg font-semibold text-white">Your wishlist is empty</h2>
        <p className="max-w-sm text-sm text-white/50">Tap the heart icon on any game to save it here.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {wishlist.map((entry) => (
          <div key={entry.id} className="group relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03]">
            <button
              onClick={() => toggleWishlist(entry)}
              className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-1.5 backdrop-blur transition hover:bg-black/70"
              aria-label="Remove from wishlist"
            >
              <X size={14} className="text-white/80" />
            </button>
            <div className="aspect-[16/9] overflow-hidden bg-black/40">
              {entry.image ? (
                <img src={entry.image} alt={entry.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-white/30">No image</div>
              )}
            </div>
            <div className="p-3">
              <h3 className="truncate text-sm font-medium text-white/90">{entry.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

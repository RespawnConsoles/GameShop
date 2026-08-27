import { Library as LibraryIcon } from 'lucide-react';
import { useStore } from '../lib/store';
import { PLAYABLE_GAMES } from '../games';

interface LibraryPageProps {
  onPlay: (id: string) => void;
}

export function LibraryPage({ onPlay }: LibraryPageProps) {
  const { library, uploadedGames } = useStore();
  const approvedUploadIds = new Set(uploadedGames.filter((g) => g.status === 'approved').map((g) => g.id));

  if (library.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
        <LibraryIcon size={32} className="text-white/20" />
        <h2 className="text-lg font-semibold text-white">Your library is empty</h2>
        <p className="max-w-sm text-sm text-white/50">Games you buy from the Store will show up here.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {[...library]
          .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))
          .map((entry) => {
            const playable = Boolean(PLAYABLE_GAMES[entry.id]) || approvedUploadIds.has(entry.id);
            return (
              <div key={entry.id} className="group overflow-hidden rounded-lg border border-white/5 bg-white/[0.03]">
                <div className="relative aspect-[16/9] overflow-hidden bg-black/40">
                  {entry.image ? (
                    <img src={entry.image} alt={entry.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-white/30">No image</div>
                  )}
                  {playable && (
                    <button
                      onClick={() => onPlay(entry.id)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100"
                    >
                      <span className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">▶ Play</span>
                    </button>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="truncate text-sm font-medium text-white/90">{entry.name}</h3>
                  <p className="mt-1 text-xs text-white/40">
                    Purchased {new Date(entry.purchasedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

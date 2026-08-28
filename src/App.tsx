import { useState } from 'react';
import { StoreProvider } from './lib/store';
import type { CatalogGame } from './lib/catalog';
import { Sidebar, type View } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { GameDetailModal } from './components/GameDetailModal';
import { PlayView } from './components/PlayView';
import { Toast } from './components/Toast';
import { StorePage } from './pages/StorePage';
import { LibraryPage } from './pages/LibraryPage';
import { WishlistPage } from './pages/WishlistPage';
import { CreatorPage } from './pages/CreatorPage';

export default function App() {
  const [view, setView] = useState<View>('store');
  const [search, setSearch] = useState('');
  const [activeGame, setActiveGame] = useState<CatalogGame | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <StoreProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-[#0e0f13] text-white">
        <TopBar search={search} onSearch={setSearch} showSearch={view === 'store'} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar view={view} onChange={setView} />
          {view === 'store' && <StorePage search={search} onOpen={setActiveGame} />}
          {view === 'library' && <LibraryPage onPlay={setPlayingId} onOpen={setActiveGame} />}
          {view === 'wishlist' && <WishlistPage />}
          {view === 'creator' && <CreatorPage />}
        </div>
      </div>

      {activeGame && (
        <GameDetailModal
          game={activeGame}
          onClose={() => setActiveGame(null)}
          onPurchased={(name) => {
            showToast(`Purchased ${name}!`);
          }}
          onPlay={(id) => {
            setActiveGame(null);
            setPlayingId(id);
          }}
        />
      )}

      {playingId && <PlayView gameId={playingId} onExit={() => setPlayingId(null)} />}

      {toast && <Toast message={toast} />}
    </StoreProvider>
  );
}

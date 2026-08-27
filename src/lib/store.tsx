import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { gamesForStudio } from './catalog';
import type { Account, Achievement, LibraryEntry, Studio, StudioGame, StoreState, UploadedGame, WishlistEntry } from './types';

const DEFAULT_STATE: StoreState = { wallet: 500, library: [], wishlist: [], account: null, uploadedGames: [] };

interface BuyResult {
  ok: boolean;
  reason?: string;
}

const STUDIO_COLORS = ['#34d399', '#60a5fa', '#f8b800', '#f87171', '#a78bfa', '#fb923c'];

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The only way a game joins a studio: its `maker` credit matches the studio's
 * name. Adds any newly-matching games; never removes ones already linked (so a
 * later rename can't silently erase achievements someone already curated).
 */
function syncStudioGames(studio: Studio): Studio {
  const matched = gamesForStudio(studio.name);
  const existingIds = new Set(studio.games.map((g) => g.catalogGameId));
  const newGames: StudioGame[] = matched
    .filter((g) => !existingIds.has(g.id))
    .map((g) => ({ id: makeId(), catalogGameId: g.id, achievements: [] }));
  if (newGames.length === 0) return studio;
  return { ...studio, games: [...studio.games, ...newGames] };
}

interface StoreContextValue extends StoreState {
  loading: boolean;
  owns: (id: string) => boolean;
  isWishlisted: (id: string) => boolean;
  buy: (entry: LibraryEntry) => BuyResult;
  toggleWishlist: (entry: WishlistEntry) => void;
  addFunds: (amount: number) => void;
  createAccount: (email: string, name: string) => void;
  renameAccount: (name: string) => void;
  signOut: () => void;
  createStudio: (name: string) => Studio | null;
  renameStudio: (id: string, name: string) => void;
  deleteStudio: (id: string) => void;
  removeGameFromStudio: (studioId: string, studioGameId: string) => void;
  addAchievement: (studioId: string, studioGameId: string, name: string, description: string) => void;
  deleteAchievement: (studioId: string, studioGameId: string, achievementId: string) => void;
  uploadGame: (studioId: string, title: string, description: string) => Promise<UploadOutcome>;
  updateUploadedGameDescription: (id: string, description: string) => void;
  pickUploadedGameIcon: (id: string) => Promise<{ ok: boolean; error?: string }>;
  deleteUploadedGame: (id: string) => void;
}

export type UploadOutcome =
  | { ok: true; game: UploadedGame }
  | { ok: false; error: string; findings?: { file: string; message: string }[] }
  | { ok: false; cancelled: true };

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.gameshop.getStore().then((s) => {
      // Defensive: normalize older persisted studios that predate the `games` field,
      // then sync in any catalog games whose maker now matches a studio's name.
      const normalized: StoreState = {
        ...s,
        uploadedGames: s.uploadedGames ?? [],
        account: s.account
          ? {
              ...s.account,
              studios: s.account.studios.map((studio) => syncStudioGames({ ...studio, games: studio.games ?? [] })),
            }
          : s.account,
      };
      setState(normalized);
      setLoading(false);
    });
  }, []);

  const persist = useCallback((next: StoreState) => {
    setState(next);
    void window.gameshop.setStore(next);
  }, []);

  const owns = useCallback((id: string) => state.library.some((g) => g.id === id), [state.library]);
  const isWishlisted = useCallback((id: string) => state.wishlist.some((w) => w.id === id), [state.wishlist]);

  const buy = useCallback(
    (entry: LibraryEntry): BuyResult => {
      if (state.library.some((g) => g.id === entry.id)) return { ok: false, reason: 'Already in your library' };
      if (state.wallet < entry.price) return { ok: false, reason: 'Insufficient funds' };

      persist({
        ...state,
        wallet: Math.round((state.wallet - entry.price) * 100) / 100,
        library: [...state.library, entry],
        wishlist: state.wishlist.filter((w) => w.id !== entry.id),
      });
      return { ok: true };
    },
    [state, persist],
  );

  const toggleWishlist = useCallback(
    (entry: WishlistEntry) => {
      persist({
        ...state,
        wishlist: state.wishlist.some((w) => w.id === entry.id)
          ? state.wishlist.filter((w) => w.id !== entry.id)
          : [...state.wishlist, entry],
      });
    },
    [state, persist],
  );

  const addFunds = useCallback(
    (amount: number) => {
      persist({ ...state, wallet: Math.round((state.wallet + amount) * 100) / 100 });
    },
    [state, persist],
  );

  const createAccount = useCallback(
    (email: string, name: string) => {
      const account: Account = { email, name, studios: [] };
      persist({ ...state, account });
    },
    [state, persist],
  );

  const renameAccount = useCallback(
    (name: string) => {
      if (!state.account) return;
      persist({ ...state, account: { ...state.account, name } });
    },
    [state, persist],
  );

  const signOut = useCallback(() => {
    persist({ ...state, account: null });
  }, [state, persist]);

  const createStudio = useCallback(
    (name: string): Studio | null => {
      if (!state.account) return null;
      const studio: Studio = syncStudioGames({
        id: makeId(),
        name,
        color: STUDIO_COLORS[state.account.studios.length % STUDIO_COLORS.length],
        createdAt: new Date().toISOString(),
        games: [],
      });
      persist({ ...state, account: { ...state.account, studios: [...state.account.studios, studio] } });
      return studio;
    },
    [state, persist],
  );

  const renameStudio = useCallback(
    (id: string, name: string) => {
      if (!state.account) return;
      persist({
        ...state,
        account: {
          ...state.account,
          studios: state.account.studios.map((s) => (s.id === id ? syncStudioGames({ ...s, name }) : s)),
        },
      });
    },
    [state, persist],
  );

  const deleteStudio = useCallback(
    (id: string) => {
      if (!state.account) return;
      persist({
        ...state,
        account: { ...state.account, studios: state.account.studios.filter((s) => s.id !== id) },
      });
    },
    [state, persist],
  );

  const updateStudio = useCallback(
    (studioId: string, fn: (studio: Studio) => Studio) => {
      if (!state.account) return;
      persist({
        ...state,
        account: {
          ...state.account,
          studios: state.account.studios.map((s) => (s.id === studioId ? fn(s) : s)),
        },
      });
    },
    [state, persist],
  );

  const removeGameFromStudio = useCallback(
    (studioId: string, studioGameId: string) => {
      updateStudio(studioId, (studio) => ({
        ...studio,
        games: studio.games.filter((g) => g.id !== studioGameId),
      }));
    },
    [updateStudio],
  );

  // studioGameId may refer either to a catalog-linked StudioGame or an UploadedGame's id.
  const isUploadedGameId = useCallback(
    (studioGameId: string) => state.uploadedGames.some((g) => g.id === studioGameId),
    [state.uploadedGames],
  );

  const addAchievement = useCallback(
    (studioId: string, studioGameId: string, name: string, description: string) => {
      const achievement: Achievement = { id: makeId(), name, description, createdAt: new Date().toISOString() };
      if (isUploadedGameId(studioGameId)) {
        persist({
          ...state,
          uploadedGames: state.uploadedGames.map((g) =>
            g.id === studioGameId ? { ...g, achievements: [...g.achievements, achievement] } : g,
          ),
        });
        return;
      }
      updateStudio(studioId, (studio) => ({
        ...studio,
        games: studio.games.map((g) =>
          g.id === studioGameId ? { ...g, achievements: [...g.achievements, achievement] } : g,
        ),
      }));
    },
    [state, persist, updateStudio, isUploadedGameId],
  );

  const deleteAchievement = useCallback(
    (studioId: string, studioGameId: string, achievementId: string) => {
      if (isUploadedGameId(studioGameId)) {
        persist({
          ...state,
          uploadedGames: state.uploadedGames.map((g) =>
            g.id === studioGameId ? { ...g, achievements: g.achievements.filter((a) => a.id !== achievementId) } : g,
          ),
        });
        return;
      }
      updateStudio(studioId, (studio) => ({
        ...studio,
        games: studio.games.map((g) =>
          g.id === studioGameId ? { ...g, achievements: g.achievements.filter((a) => a.id !== achievementId) } : g,
        ),
      }));
    },
    [state, persist, updateStudio, isUploadedGameId],
  );

  const uploadGame = useCallback(
    async (studioId: string, title: string, description: string): Promise<UploadOutcome> => {
      const result = await window.gameshop.uploadGame();
      if (!result) return { ok: false, cancelled: true };
      if (result.error || !result.id || !result.folder || !result.entryUrl || !result.status) {
        return { ok: false, error: result.error ?? 'Upload failed.' };
      }
      const game: UploadedGame = {
        id: result.id,
        studioId,
        title,
        description,
        image: null,
        entryUrl: result.entryUrl,
        folder: result.folder,
        status: result.status,
        findings: result.findings ?? [],
        achievements: [],
        uploadedAt: new Date().toISOString(),
      };
      persist({ ...state, uploadedGames: [...state.uploadedGames, game] });
      if (game.status === 'rejected') {
        return { ok: false, error: 'Failed the security check.', findings: game.findings };
      }
      return { ok: true, game };
    },
    [state, persist],
  );

  const updateUploadedGameDescription = useCallback(
    (id: string, description: string) => {
      persist({
        ...state,
        uploadedGames: state.uploadedGames.map((g) => (g.id === id ? { ...g, description } : g)),
      });
    },
    [state, persist],
  );

  const pickUploadedGameIcon = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const result = await window.gameshop.pickGameIcon();
      if (!result) return { ok: false };
      if (result.error || !result.dataUrl) return { ok: false, error: result.error ?? 'Could not set the icon.' };
      persist({
        ...state,
        uploadedGames: state.uploadedGames.map((g) => (g.id === id ? { ...g, image: result.dataUrl! } : g)),
      });
      return { ok: true };
    },
    [state, persist],
  );

  const deleteUploadedGame = useCallback(
    (id: string) => {
      void window.gameshop.deleteUpload(id);
      persist({ ...state, uploadedGames: state.uploadedGames.filter((g) => g.id !== id) });
    },
    [state, persist],
  );

  return (
    <StoreContext.Provider
      value={{
        ...state,
        loading,
        owns,
        isWishlisted,
        buy,
        toggleWishlist,
        addFunds,
        createAccount,
        renameAccount,
        signOut,
        createStudio,
        renameStudio,
        deleteStudio,
        removeGameFromStudio,
        addAchievement,
        deleteAchievement,
        uploadGame,
        updateUploadedGameDescription,
        pickUploadedGameIcon,
        deleteUploadedGame,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}

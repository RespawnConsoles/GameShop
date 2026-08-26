import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Account, LibraryEntry, Studio, StoreState, WishlistEntry } from './types';

const DEFAULT_STATE: StoreState = { wallet: 500, library: [], wishlist: [], account: null };

interface BuyResult {
  ok: boolean;
  reason?: string;
}

const STUDIO_COLORS = ['#34d399', '#60a5fa', '#f8b800', '#f87171', '#a78bfa', '#fb923c'];

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.gameshop.getStore().then((s) => {
      setState(s);
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
      const studio: Studio = {
        id: makeId(),
        name,
        color: STUDIO_COLORS[state.account.studios.length % STUDIO_COLORS.length],
        createdAt: new Date().toISOString(),
      };
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
          studios: state.account.studios.map((s) => (s.id === id ? { ...s, name } : s)),
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

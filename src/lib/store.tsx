import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LibraryEntry, StoreState, WishlistEntry } from './types';

const DEFAULT_STATE: StoreState = { wallet: 500, library: [], wishlist: [] };

interface BuyResult {
  ok: boolean;
  reason?: string;
}

interface StoreContextValue extends StoreState {
  loading: boolean;
  owns: (id: string) => boolean;
  isWishlisted: (id: string) => boolean;
  buy: (entry: LibraryEntry) => BuyResult;
  toggleWishlist: (entry: WishlistEntry) => void;
  addFunds: (amount: number) => void;
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

  return (
    <StoreContext.Provider value={{ ...state, loading, owns, isWishlisted, buy, toggleWishlist, addFunds }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}

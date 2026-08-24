export interface LibraryEntry {
  id: string;
  name: string;
  image: string | null;
  price: number;
  purchasedAt: string;
}

export interface WishlistEntry {
  id: string;
  name: string;
  image: string | null;
}

export interface StoreState {
  wallet: number;
  library: LibraryEntry[];
  wishlist: WishlistEntry[];
}

export interface GameshopBridge {
  getStore: () => Promise<StoreState>;
  setStore: (state: StoreState) => Promise<StoreState>;
}

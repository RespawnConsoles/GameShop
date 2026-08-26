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

export interface Studio {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Account {
  email: string;
  name: string;
  studios: Studio[];
}

export interface StoreState {
  wallet: number;
  library: LibraryEntry[];
  wishlist: WishlistEntry[];
  account: Account | null;
}

export interface GameshopBridge {
  getStore: () => Promise<StoreState>;
  setStore: (state: StoreState) => Promise<StoreState>;
}

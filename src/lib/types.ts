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

export interface Achievement {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface StudioGame {
  id: string;
  catalogGameId: string;
  achievements: Achievement[];
}

export interface Studio {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  games: StudioGame[];
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

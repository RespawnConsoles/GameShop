export interface RawgGame {
  id: number;
  name: string;
  slug: string;
  background_image: string | null;
  rating: number;
  rating_top: number;
  released: string | null;
  genres: { id: number; name: string }[];
  platforms?: { platform: { id: number; name: string } }[];
  metacritic: number | null;
  short_screenshots?: { id: number; image: string }[];
  description_raw?: string;
}

export interface Genre {
  id: number;
  name: string;
}

export interface LibraryEntry {
  id: number;
  name: string;
  image: string | null;
  price: number;
  purchasedAt: string;
}

export interface WishlistEntry {
  id: number;
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

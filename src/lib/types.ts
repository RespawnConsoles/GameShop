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

export type UploadStatus = 'approved' | 'rejected';

export interface SecurityFinding {
  file: string;
  message: string;
}

export interface UploadedGame {
  id: string;
  studioId: string;
  title: string;
  description: string;
  image: string | null;
  entryUrl: string;
  folder: string;
  status: UploadStatus;
  findings: SecurityFinding[];
  achievements: Achievement[];
  uploadedAt: string;
}

export interface StoreState {
  wallet: number;
  library: LibraryEntry[];
  wishlist: WishlistEntry[];
  account: Account | null;
  uploadedGames: UploadedGame[];
}

export interface UploadDialogResult {
  error?: string;
  id?: string;
  folder?: string;
  entryUrl?: string;
  status?: UploadStatus;
  findings?: SecurityFinding[];
}

export interface IconDialogResult {
  error?: string;
  dataUrl?: string;
}

export interface GameshopBridge {
  getStore: () => Promise<StoreState>;
  setStore: (state: StoreState) => Promise<StoreState>;
  uploadGame: () => Promise<UploadDialogResult | null>;
  pickGameIcon: () => Promise<IconDialogResult | null>;
  deleteUpload: (id: string) => Promise<void>;
  shareViaMessages: () => Promise<{ ok: boolean; error?: string }>;
}

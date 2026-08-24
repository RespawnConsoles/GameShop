import type { Genre, RawgGame } from './types';

const API_KEY = import.meta.env.VITE_RAWG_API_KEY;
const BASE_URL = 'https://api.rawg.io/api';

export function hasApiKey(): boolean {
  return Boolean(API_KEY && API_KEY !== 'YOUR_RAWG_API_KEY_HERE');
}

async function rawgFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(BASE_URL + path);
  url.searchParams.set('key', API_KEY ?? '');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`RAWG API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface FetchGamesOptions {
  search?: string;
  genres?: string;
  ordering?: string;
  page?: number;
}

export async function fetchGames(opts: FetchGamesOptions = {}): Promise<RawgGame[]> {
  const params: Record<string, string> = { page_size: '24' };
  if (opts.search) params.search = opts.search;
  if (opts.genres) params.genres = opts.genres;
  if (opts.ordering) params.ordering = opts.ordering;
  if (opts.page) params.page = String(opts.page);

  const data = await rawgFetch<{ results: RawgGame[] }>('/games', params);
  return data.results;
}

export async function fetchGenres(): Promise<Genre[]> {
  const data = await rawgFetch<{ results: Genre[] }>('/genres');
  return data.results;
}

export async function fetchGameDetail(id: number): Promise<RawgGame> {
  return rawgFetch<RawgGame>(`/games/${id}`);
}

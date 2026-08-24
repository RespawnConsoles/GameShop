export interface ScoreEntry {
  name: string;
  score: number;
  level: number;
}

const KEY_PREFIX = 'gameshop-scores-';

export function loadScores(gameId: string): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + gameId);
    return raw ? (JSON.parse(raw) as ScoreEntry[]) : [];
  } catch {
    return [];
  }
}

export function submitScore(gameId: string, entry: ScoreEntry): { rank: number; top3: ScoreEntry[] } {
  const all = loadScores(gameId);
  all.push(entry);
  all.sort((a, b) => b.score - a.score);
  const trimmed = all.slice(0, 50);
  try {
    localStorage.setItem(KEY_PREFIX + gameId, JSON.stringify(trimmed));
  } catch {
    /* ignore quota errors */
  }
  const rank = trimmed.findIndex((s) => s === entry) + 1;
  return { rank, top3: trimmed.slice(0, 3) };
}

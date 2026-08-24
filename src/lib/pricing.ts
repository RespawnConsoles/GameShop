const TIERS = [4.99, 9.99, 14.99, 19.99, 24.99];

function hashString(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Deterministic mock price so the same game always costs the same amount. */
export function mockPrice(id: string): number {
  return TIERS[hashString(id) % TIERS.length];
}

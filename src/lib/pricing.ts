const TIERS = [4.99, 9.99, 14.99, 19.99, 24.99, 29.99, 39.99, 49.99, 59.99];

/** Deterministic mock price so the same game always costs the same amount. */
export function mockPrice(id: number, rating: number): number {
  const hash = (id * 2654435761) % TIERS.length;
  let idx = hash;
  if (rating >= 4.3) idx += 2;
  else if (rating >= 3.5) idx += 1;
  return TIERS[Math.min(TIERS.length - 1, idx)];
}

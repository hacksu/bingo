import { createHash } from 'node:crypto';

/**
 * Deterministically shuffles a player's tiles using their cardSeed.
 *
 * Each tile is decorated with `sha256(seed + ':' + tile.id)`; sorting by that
 * hash gives a stable, well-distributed permutation per (seed, tile set). Adding
 * or removing a tile only moves it in the order; existing tiles' relative order
 * is preserved as long as the seed is unchanged.
 *
 * The free-space tile (if exactly one exists) is pinned to the grid center so
 * the classic 5x5 board always has its center as the free space.
 *
 * If `seed` is empty, tiles are returned sorted by their global `position`.
 */
export function shuffleTilesForUser<
  T extends { id: string; position: number; isFreeSpace: boolean }
>(tiles: T[], seed: string | null | undefined): T[] {
  const sortedByPosition = [...tiles].sort((a, b) => a.position - b.position);
  if (!seed) return sortedByPosition;

  const decorated = sortedByPosition.map((tile) => ({
    tile,
    key: createHash('sha256').update(`${seed}:${tile.id}`).digest('hex')
  }));
  decorated.sort((a, b) => a.key.localeCompare(b.key));
  const shuffled = decorated.map((d) => d.tile);

  const freeSpaces = shuffled.filter((t) => t.isFreeSpace);
  if (freeSpaces.length === 1) {
    const fs = freeSpaces[0];
    const rest = shuffled.filter((t) => !t.isFreeSpace);
    const center = Math.floor(shuffled.length / 2);
    rest.splice(center, 0, fs);
    return rest;
  }

  return shuffled;
}

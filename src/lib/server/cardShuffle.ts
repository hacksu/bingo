import { createHash } from 'node:crypto';
import { GRID_SIZE } from '$lib/bingo';

/**
 * Deterministically picks a player's card from the tile pool using their cardSeed.
 *
 * The pool may be larger than the card (extra tiles for variety). Each tile is
 * decorated with `sha256(seed + ':' + tile.id)`; sorting by that hash gives a
 * stable, well-distributed permutation per (seed, tile set). The first N² tiles
 * after sorting form the card.
 *
 * If exactly one free-space tile exists in the pool, it is always included
 * (taking one of the N² slots) and pinned to the grid center.
 *
 * Stability caveat: adding new tiles to the pool may shift which subset a
 * player sees, because the new tile's hash gets sorted into the order. Set up
 * the pool before play begins, or add tiles in a locked state if mid-event.
 *
 * If `seed` is empty, returns the first N² tiles by canonical `position`.
 */
export function shuffleTilesForUser<
  T extends { id: string; position: number; isFreeSpace: boolean }
>(tiles: T[], seed: string | null | undefined, cardSize: number = GRID_SIZE): T[] {
  const target = cardSize * cardSize;
  const sortedByPosition = [...tiles].sort((a, b) => a.position - b.position);

  if (!seed) return sortedByPosition.slice(0, target);

  const decorated = sortedByPosition.map((tile) => ({
    tile,
    key: createHash('sha256').update(`${seed}:${tile.id}`).digest('hex')
  }));
  decorated.sort((a, b) => a.key.localeCompare(b.key));
  const shuffled = decorated.map((d) => d.tile);

  const freeSpace = shuffled.find((t) => t.isFreeSpace);
  const nonFree = shuffled.filter((t) => !t.isFreeSpace);

  if (!freeSpace) return shuffled.slice(0, target);

  // Reserve one slot for the free space; pick the rest from non-free pool.
  const picked = nonFree.slice(0, target - 1);
  const center = Math.floor(target / 2);
  picked.splice(center, 0, freeSpace);
  return picked;
}

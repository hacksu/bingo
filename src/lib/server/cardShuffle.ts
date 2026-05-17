import { createHash } from 'node:crypto';
import { GRID_SIZE } from '$lib/bingo';

type Tile = { id: string; position: number; isFreeSpace: boolean };

/**
 * Deterministically picks a player's card from the tile pool using their cardSeed.
 *
 * The pool may be larger than the card (extra tiles for variety). Each tile is
 * decorated with `sha256(seed + ':' + tile.id)`; sorting by that hash gives a
 * stable, well-distributed permutation per (seed, tile set). The first N² tiles
 * after sorting form the card.
 *
 * If any free-space tile exists in the pool, ONE is always included on every
 * card and pinned to the grid center. This holds in both the seeded and the
 * unseeded (fallback) paths.
 *
 * Stability caveat: adding new tiles to the pool may shift which subset a
 * player sees, because the new tile's hash gets sorted into the order. Set up
 * the pool before play begins, or add tiles in a locked state if mid-event.
 */
export function shuffleTilesForUser<T extends Tile>(
  tiles: T[],
  seed: string | null | undefined,
  cardSize: number = GRID_SIZE
): T[] {
  const target = cardSize * cardSize;

  const ordered = seed
    ? hashOrder(tiles, seed)
    : [...tiles].sort((a, b) => a.position - b.position);

  return pickCardWithFreeSpace(ordered, target);
}

function hashOrder<T extends Tile>(tiles: T[], seed: string): T[] {
  return [...tiles]
    .map((tile) => ({
      tile,
      key: createHash('sha256').update(`${seed}:${tile.id}`).digest('hex')
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((d) => d.tile);
}

/**
 * Picks N² tiles from an already-ordered pool, guaranteeing that if any
 * free-space tile exists in the pool it occupies the center slot of the
 * returned card. If multiple free-space tiles exist, the first one in the
 * input order is chosen; the rest are omitted (treating them as duplicates
 * of an admin misconfiguration rather than as regular tiles, which would
 * give the player a bonus auto-completion in a random spot).
 */
function pickCardWithFreeSpace<T extends Tile>(ordered: T[], target: number): T[] {
  const freeSpace = ordered.find((t) => t.isFreeSpace);

  if (!freeSpace) return ordered.slice(0, target);

  const nonFree = ordered.filter((t) => !t.isFreeSpace);
  const picked = nonFree.slice(0, target - 1);
  const center = Math.floor(target / 2);
  picked.splice(center, 0, freeSpace);
  return picked;
}

import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bingoProgress, bingoTile, user } from '$lib/server/db/schema';
import { detectBingo } from '$lib/bingo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const tiles = await db.select().from(bingoTile).where(eq(bingoTile.isActive, true));
  const allProgress = await db.select().from(bingoProgress);
  const users = await db.select().from(user);

  const tileById = new Map(tiles.map((t) => [t.id, t]));
  const freeSpacePositions = new Set(tiles.filter((t) => t.isFreeSpace).map((t) => t.position));

  const progressByUser = new Map<string, { positions: Set<number>; count: number }>();
  for (const p of allProgress) {
    const tile = tileById.get(p.tileId);
    if (!tile) continue;
    let entry = progressByUser.get(p.userId);
    if (!entry) {
      entry = { positions: new Set(freeSpacePositions), count: 0 };
      progressByUser.set(p.userId, entry);
    }
    entry.positions.add(tile.position);
    entry.count++;
  }

  const rows = users.map((u) => {
    const entry = progressByUser.get(u.id) ?? {
      positions: new Set(freeSpacePositions),
      count: 0
    };
    const { hasBingo } = detectBingo(entry.positions);
    const verified = !!u.bingoVerifiedAt;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      role: u.role,
      completed: entry.count,
      hasBingo,
      verified,
      verifiedAt: u.bingoVerifiedAt,
      // Highest priority: unverified bingos (needs admin action).
      // Then verified bingos. Then everyone else.
      sortRank: hasBingo && !verified ? 2 : hasBingo && verified ? 1 : 0
    };
  });

  rows.sort(
    (a, b) =>
      b.sortRank - a.sortRank ||
      b.completed - a.completed ||
      a.name.localeCompare(b.name)
  );

  return {
    users: rows,
    tileCount: tiles.length,
    pendingCount: rows.filter((r) => r.hasBingo && !r.verified).length,
    verifiedCount: rows.filter((r) => r.verified).length
  };
};

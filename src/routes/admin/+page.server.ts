import { db } from '$lib/server/db';
import { bingoProgress, bingoTile, user } from '$lib/server/db/schema';
import { detectBingo } from '$lib/bingo';
import { shuffleTilesForUser } from '$lib/server/cardShuffle';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const tiles = await db.select().from(bingoTile);
  const allProgress = await db.select().from(bingoProgress);
  const users = await db.select().from(user);

  const completedByUser = new Map<string, Set<string>>();
  for (const p of allProgress) {
    let s = completedByUser.get(p.userId);
    if (!s) {
      s = new Set<string>();
      completedByUser.set(p.userId, s);
    }
    s.add(p.tileId);
  }

  const rows = users.map((u) => {
    const completedIds = completedByUser.get(u.id) ?? new Set<string>();
    // Per-user shuffle: bingo detection has to use the indices THIS player sees,
    // not the canonical positions, otherwise the badge could disagree with the
    // player's own card.
    const ordered = shuffleTilesForUser(tiles, u.cardSeed);
    const positions = new Set<number>();
    ordered.forEach((t, idx) => {
      if (completedIds.has(t.id) || t.isFreeSpace) positions.add(idx);
    });
    const { hasBingo } = detectBingo(positions);
    const verified = !!u.bingoVerifiedAt;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      role: u.role,
      completed: completedIds.size,
      hasBingo,
      verified,
      verifiedAt: u.bingoVerifiedAt,
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
    lockedCount: tiles.filter((t) => !t.isActive).length,
    pendingCount: rows.filter((r) => r.hasBingo && !r.verified).length,
    verifiedCount: rows.filter((r) => r.verified).length
  };
};

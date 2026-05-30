// src/lib/server/standings.ts
import { db } from './db';
import { bingoProgress, bingoTile, user } from './db/schema';
import { detectBingo } from '$lib/bingo';
import { shuffleTilesForUser } from './cardShuffle';

export type UserStanding = {
  id: string;
  name: string;
  image: string | null;
  role: string;
  completed: number; // count of the player's self-marked progress rows
  hasBingo: boolean; // detectBingo() on their seeded card
  verifiedAt: Date | null; // bingoVerifiedAt
};

export type StandingsResult = {
  standings: UserStanding[]; // name-sorted; consumers apply their own ranking
  tileCount: number; // total tiles in the pool
  lockedCount: number; // tiles with isActive = false
};

export async function loadStandings(): Promise<StandingsResult> {
  const tiles = await db
    .select({
      id: bingoTile.id,
      position: bingoTile.position,
      isFreeSpace: bingoTile.isFreeSpace,
      isActive: bingoTile.isActive
    })
    .from(bingoTile);

  const allProgress = await db
    .select({ userId: bingoProgress.userId, tileId: bingoProgress.tileId })
    .from(bingoProgress);

  const users = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
      role: user.role,
      cardSeed: user.cardSeed,
      bingoVerifiedAt: user.bingoVerifiedAt
    })
    .from(user);

  const completedByUser = new Map<string, Set<string>>();
  for (const p of allProgress) {
    let s = completedByUser.get(p.userId);
    if (!s) {
      s = new Set<string>();
      completedByUser.set(p.userId, s);
    }
    s.add(p.tileId);
  }

  const standings: UserStanding[] = users
    .map((u) => {
      const completedIds = completedByUser.get(u.id) ?? new Set<string>();
      const ordered = shuffleTilesForUser(tiles, u.cardSeed);
      const positions = new Set<number>();
      ordered.forEach((t, idx) => {
        if (completedIds.has(t.id) || t.isFreeSpace) positions.add(idx);
      });
      const { hasBingo } = detectBingo(positions);
      return {
        id: u.id,
        name: u.name,
        image: u.image,
        role: u.role,
        completed: completedIds.size,
        hasBingo,
        verifiedAt: u.bingoVerifiedAt
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    standings,
    tileCount: tiles.length,
    lockedCount: tiles.filter((t) => !t.isActive).length
  };
}

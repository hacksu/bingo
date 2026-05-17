import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db';
import { bingoProgress, bingoTile, user } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import { detectBingo } from '$lib/bingo';
import { shuffleTilesForUser } from '$lib/server/cardShuffle';
import type { Actions, PageServerLoad } from './$types';

async function resetUserBoard(userId: string, regenerateSeed: boolean): Promise<void> {
  await db.delete(bingoProgress).where(eq(bingoProgress.userId, userId));
  await db
    .update(user)
    .set({
      bingoVerifiedAt: null,
      bingoVerifiedBy: null,
      ...(regenerateSeed ? { cardSeed: randomUUID() } : {}),
      updatedAt: new Date()
    })
    .where(eq(user.id, userId));
}

async function ensureCardSeed(userId: string, existing: string | null): Promise<string> {
  if (existing) return existing;
  const seed = randomUUID();
  await db.update(user).set({ cardSeed: seed, updatedAt: new Date() }).where(eq(user.id, userId));
  return seed;
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, '/login');

  const tiles = await db.select().from(bingoTile).orderBy(bingoTile.position);

  const progress = await db
    .select()
    .from(bingoProgress)
    .where(eq(bingoProgress.userId, locals.user.id));

  const [me] = await db
    .select({
      bingoVerifiedAt: user.bingoVerifiedAt,
      bingoVerifiedBy: sql<string | null>`(SELECT name FROM "user" WHERE id = ${user.bingoVerifiedBy})`,
      cardSeed: user.cardSeed
    })
    .from(user)
    .where(eq(user.id, locals.user.id))
    .limit(1);

  const seed = await ensureCardSeed(locals.user.id, me?.cardSeed ?? null);
  const ordered = shuffleTilesForUser(tiles, seed);

  const completed = new Set(progress.map((p) => p.tileId));

  // After shuffling, the "displayed position" of a tile is its index in `ordered`,
  // not its global `tile.position`. Bingo detection runs on those indices.
  const completedPositions = new Set<number>();
  ordered.forEach((t, idx) => {
    if (completed.has(t.id) || t.isFreeSpace) completedPositions.add(idx);
  });
  const { hasBingo, winningPositions } = detectBingo(completedPositions);

  return {
    tiles: ordered.map((t, idx) => ({
      ...t,
      completed: completed.has(t.id) || t.isFreeSpace,
      winning: winningPositions.has(idx)
    })),
    hasBingo,
    verifiedAt: me?.bingoVerifiedAt ?? null,
    verifiedBy: me?.bingoVerifiedBy ?? null
  };
};

export const actions: Actions = {
  toggle: async ({ request, locals }) => {
    if (!locals.user) throw error(401, 'Unauthorized');

    const form = await request.formData();
    const tileId = form.get('tileId');
    if (typeof tileId !== 'string' || !tileId) return fail(400, { message: 'tileId required' });

    const [tile] = await db.select().from(bingoTile).where(eq(bingoTile.id, tileId)).limit(1);
    if (!tile) return fail(404, { message: 'tile not found' });
    if (!tile.isActive) return fail(403, { message: 'tile is locked' });
    if (tile.isFreeSpace) return { ok: true };

    const existing = await db
      .select()
      .from(bingoProgress)
      .where(and(eq(bingoProgress.userId, locals.user.id), eq(bingoProgress.tileId, tileId)))
      .limit(1);

    if (existing.length) {
      await db
        .delete(bingoProgress)
        .where(and(eq(bingoProgress.userId, locals.user.id), eq(bingoProgress.tileId, tileId)));
      return { ok: true, completed: false };
    }

    await db.insert(bingoProgress).values({
      id: randomUUID(),
      userId: locals.user.id,
      tileId
    });

    return { ok: true, completed: true };
  },

  reset: async ({ locals }) => {
    if (!locals.user) throw error(401, 'Unauthorized');
    await resetUserBoard(locals.user.id, true);
    return { ok: true, reset: true };
  }
};

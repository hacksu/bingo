import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db';
import { bingoProgress, bingoTile, user } from '$lib/server/db/schema';
import { detectBingo } from '$lib/bingo';
import { shuffleTilesForUser } from '$lib/server/cardShuffle';
import { isAdmin } from '$lib/server/admin';
import { logActivity } from '$lib/server/activity';
import type { Actions, PageServerLoad } from './$types';

async function loadBingoState(targetId: string, seed: string | null) {
  const tiles = await db
    .select({ id: bingoTile.id, label: bingoTile.label, position: bingoTile.position, isFreeSpace: bingoTile.isFreeSpace, isActive: bingoTile.isActive })
    .from(bingoTile)
    .orderBy(bingoTile.position);
  const progress = await db
    .select({ tileId: bingoProgress.tileId })
    .from(bingoProgress)
    .where(eq(bingoProgress.userId, targetId));
  const completed = new Set(progress.map((p) => p.tileId));

  const ordered = shuffleTilesForUser(tiles, seed);

  const completedPositions = new Set<number>();
  ordered.forEach((t, idx) => {
    if (!t.isActive) return;
    if (completed.has(t.id) || t.isFreeSpace) completedPositions.add(idx);
  });
  const { hasBingo, winningPositions } = detectBingo(completedPositions);
  return { tiles: ordered, completed, hasBingo, winningPositions };
}

export const load: PageServerLoad = async ({ params }) => {
  const [target] = await db
    .select({ id: user.id, name: user.name, image: user.image, cardSeed: user.cardSeed, bingoVerifiedAt: user.bingoVerifiedAt, bingoVerifiedBy: user.bingoVerifiedBy })
    .from(user)
    .where(eq(user.id, params.id))
    .limit(1);
  if (!target) throw error(404, 'User not found');

  const { tiles, completed, hasBingo, winningPositions } = await loadBingoState(
    target.id,
    target.cardSeed
  );

  return {
    target: {
      id: target.id,
      name: target.name,
      image: target.image,
      bingoVerifiedAt: target.bingoVerifiedAt,
      bingoVerifiedBy: target.bingoVerifiedBy
    },
    tiles: tiles.map((t, idx) => ({
      ...t,
      completed: completed.has(t.id) || t.isFreeSpace,
      selfMarked: completed.has(t.id),
      winning: winningPositions.has(idx)
    })),
    hasBingo
  };
};

export const actions: Actions = {
  verify: async ({ params, locals }) => {
    if (!isAdmin(locals.user) || !locals.user) throw error(403, 'Admin access required');

    const [target] = await db
      .select({ id: user.id, name: user.name, cardSeed: user.cardSeed })
      .from(user)
      .where(eq(user.id, params.id))
      .limit(1);
    if (!target) return fail(404, { message: 'User not found' });

    const { hasBingo } = await loadBingoState(target.id, target.cardSeed);
    if (!hasBingo) {
      return fail(400, { message: 'Player no longer has a bingo — refresh and re-check.' });
    }

    await db
      .update(user)
      .set({
        bingoVerifiedAt: new Date(),
        bingoVerifiedBy: locals.user.id,
        updatedAt: new Date()
      })
      .where(eq(user.id, target.id));
    await logActivity({ userId: locals.user.id, type: 'admin_verify', detail: target.name });
    return { ok: true, verified: true };
  },

  unverify: async ({ params, locals }) => {
    if (!isAdmin(locals.user) || !locals.user) throw error(403, 'Admin access required');
    const [target] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, params.id))
      .limit(1);
    await db
      .update(user)
      .set({ bingoVerifiedAt: null, bingoVerifiedBy: null, updatedAt: new Date() })
      .where(eq(user.id, params.id));
    await logActivity({ userId: locals.user.id, type: 'admin_unverify', detail: target?.name ?? null });
    return { ok: true, verified: false };
  },

  reset: async ({ params, locals }) => {
    if (!isAdmin(locals.user) || !locals.user) throw error(403, 'Admin access required');
    const [target] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, params.id))
      .limit(1);
    await db.delete(bingoProgress).where(eq(bingoProgress.userId, params.id));
    await db
      .update(user)
      .set({
        bingoVerifiedAt: null,
        bingoVerifiedBy: null,
        cardSeed: randomUUID(),
        updatedAt: new Date()
      })
      .where(eq(user.id, params.id));
    await logActivity({ userId: locals.user.id, type: 'admin_reset', detail: target?.name ?? null });
    return { ok: true, reset: true };
  }
};

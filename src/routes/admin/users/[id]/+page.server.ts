import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bingoProgress, bingoTile, user } from '$lib/server/db/schema';
import { detectBingo } from '$lib/bingo';
import type { Actions, PageServerLoad } from './$types';

async function loadBingoState(targetId: string) {
  const tiles = await db.select().from(bingoTile).orderBy(bingoTile.position);
  const progress = await db.select().from(bingoProgress).where(eq(bingoProgress.userId, targetId));
  const completed = new Set(progress.map((p) => p.tileId));

  const completedPositions = new Set<number>();
  for (const t of tiles) {
    if (!t.isActive) continue;
    if (completed.has(t.id) || t.isFreeSpace) completedPositions.add(t.position);
  }
  const { hasBingo, winningPositions } = detectBingo(completedPositions);
  return { tiles, completed, hasBingo, winningPositions };
}

export const load: PageServerLoad = async ({ params }) => {
  const [target] = await db.select().from(user).where(eq(user.id, params.id)).limit(1);
  if (!target) throw error(404, 'User not found');

  const { tiles, completed, hasBingo, winningPositions } = await loadBingoState(target.id);

  return {
    target: {
      id: target.id,
      name: target.name,
      email: target.email,
      image: target.image,
      bingoVerifiedAt: target.bingoVerifiedAt,
      bingoVerifiedBy: target.bingoVerifiedBy
    },
    tiles: tiles.map((t) => ({
      ...t,
      completed: completed.has(t.id) || t.isFreeSpace,
      selfMarked: completed.has(t.id),
      winning: winningPositions.has(t.position)
    })),
    hasBingo
  };
};

export const actions: Actions = {
  verify: async ({ request, params, locals }) => {
    if (!locals.user) throw error(401, 'Unauthorized');

    const [target] = await db.select().from(user).where(eq(user.id, params.id)).limit(1);
    if (!target) return fail(404, { message: 'User not found' });

    const form = await request.formData();
    const typed = String(form.get('confirm') ?? '')
      .trim()
      .toLowerCase();
    if (typed !== target.name.trim().toLowerCase()) {
      return fail(400, { message: 'Name confirmation did not match.' });
    }

    const { hasBingo } = await loadBingoState(target.id);
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
    return { ok: true, verified: true };
  },

  unverify: async ({ params }) => {
    await db
      .update(user)
      .set({ bingoVerifiedAt: null, bingoVerifiedBy: null, updatedAt: new Date() })
      .where(eq(user.id, params.id));
    return { ok: true, verified: false };
  }
};

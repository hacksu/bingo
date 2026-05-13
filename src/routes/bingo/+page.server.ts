import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db';
import { bingoProgress, bingoTile } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, '/login');

  const tiles = await db
    .select()
    .from(bingoTile)
    .where(eq(bingoTile.isActive, true))
    .orderBy(bingoTile.position);

  const progress = await db
    .select()
    .from(bingoProgress)
    .where(eq(bingoProgress.userId, locals.user.id));

  const completed = new Set(progress.map((p) => p.tileId));

  return {
    tiles: tiles.map((t) => ({ ...t, completed: completed.has(t.id) || t.isFreeSpace }))
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
  }
};

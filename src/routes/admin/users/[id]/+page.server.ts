import { error, fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db';
import { bingoProgress, bingoTile, user } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const [target] = await db.select().from(user).where(eq(user.id, params.id)).limit(1);
  if (!target) throw error(404, 'User not found');

  const tiles = await db.select().from(bingoTile).orderBy(bingoTile.position);
  const progress = await db
    .select()
    .from(bingoProgress)
    .where(eq(bingoProgress.userId, target.id));
  const completed = new Set(progress.map((p) => p.tileId));

  return {
    target: { id: target.id, name: target.name, email: target.email, image: target.image },
    tiles: tiles.map((t) => ({ ...t, completed: completed.has(t.id) }))
  };
};

export const actions: Actions = {
  toggle: async ({ request, params }) => {
    const form = await request.formData();
    const tileId = form.get('tileId');
    if (typeof tileId !== 'string' || !tileId) return fail(400, { message: 'tileId required' });

    const [existing] = await db
      .select()
      .from(bingoProgress)
      .where(and(eq(bingoProgress.userId, params.id), eq(bingoProgress.tileId, tileId)))
      .limit(1);

    if (existing) {
      await db
        .delete(bingoProgress)
        .where(and(eq(bingoProgress.userId, params.id), eq(bingoProgress.tileId, tileId)));
      return { ok: true, completed: false };
    }

    await db
      .insert(bingoProgress)
      .values({ id: randomUUID(), userId: params.id, tileId });
    return { ok: true, completed: true };
  }
};

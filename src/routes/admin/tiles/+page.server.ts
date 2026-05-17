import { fail } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db';
import { bingoTile } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const tiles = await db.select().from(bingoTile).orderBy(bingoTile.position);
  return { tiles };
};

function parseTileId(form: FormData) {
  const id = form.get('id');
  return typeof id === 'string' && id ? id : null;
}

export const actions: Actions = {
  update: async ({ request }) => {
    const form = await request.formData();
    const id = parseTileId(form);
    if (!id) return fail(400, { message: 'id required' });

    const label = String(form.get('label') ?? '').trim();
    const positionRaw = form.get('position');
    const position = positionRaw === null ? NaN : Number(positionRaw);
    const isActive = form.get('isActive') === 'on';
    const isFreeSpace = form.get('isFreeSpace') === 'on';

    if (!label) return fail(400, { message: 'label required' });
    if (!Number.isInteger(position) || position < 0) {
      return fail(400, { message: 'position must be a non-negative integer' });
    }

    await db
      .update(bingoTile)
      .set({ label, position, isActive, isFreeSpace })
      .where(eq(bingoTile.id, id));
    return { ok: true };
  },

  create: async ({ request }) => {
    const form = await request.formData();
    const label = String(form.get('label') ?? '').trim();
    if (!label) return fail(400, { message: 'label required' });

    const [{ max = -1 } = { max: -1 }] = await db
      .select({ max: sql<number>`coalesce(max(${bingoTile.position}), -1)::int` })
      .from(bingoTile);

    await db.insert(bingoTile).values({
      id: randomUUID(),
      label,
      position: max + 1,
      isActive: true,
      isFreeSpace: false
    });
    return { ok: true };
  },

  delete: async ({ request }) => {
    const form = await request.formData();
    const id = parseTileId(form);
    if (!id) return fail(400, { message: 'id required' });
    await db.delete(bingoTile).where(eq(bingoTile.id, id));
    return { ok: true };
  }
};

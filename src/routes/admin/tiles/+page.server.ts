import { error, fail } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db';
import { bingoTile } from '$lib/server/db/schema';
import { GRID_SIZE } from '$lib/bingo';
import { isAdmin } from '$lib/server/admin';
import { logActivity } from '$lib/server/activity';
import type { Actions, PageServerLoad } from './$types';

const TARGET_TILES = GRID_SIZE * GRID_SIZE;

export const load: PageServerLoad = async () => {
  const tiles = await db
    .select({ id: bingoTile.id, label: bingoTile.label, position: bingoTile.position, isFreeSpace: bingoTile.isFreeSpace, isActive: bingoTile.isActive })
    .from(bingoTile)
    .orderBy(bingoTile.position);
  return {
    tiles,
    target: TARGET_TILES,
    gridSize: GRID_SIZE
  };
};

function parseTileId(form: FormData) {
  const id = form.get('id');
  return typeof id === 'string' && id ? id : null;
}

function parseLabels(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(',')[0].trim().replace(/^"(.*)"$/, '$1').trim())
    .filter((s) => s.length > 0);
}

export const actions: Actions = {
  update: async ({ request, locals }) => {
    if (!isAdmin(locals.user) || !locals.user) throw error(403, 'Admin access required');
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
    await logActivity({ userId: locals.user.id, type: 'tile_update', detail: label });
    return { ok: true };
  },

  create: async ({ request, locals }) => {
    if (!isAdmin(locals.user) || !locals.user) throw error(403, 'Admin access required');
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
    await logActivity({ userId: locals.user.id, type: 'tile_create', detail: label });
    return { ok: true };
  },

  delete: async ({ request, locals }) => {
    if (!isAdmin(locals.user) || !locals.user) throw error(403, 'Admin access required');
    const form = await request.formData();
    const id = parseTileId(form);
    if (!id) return fail(400, { message: 'id required' });
    const [tile] = await db
      .select({ label: bingoTile.label })
      .from(bingoTile)
      .where(eq(bingoTile.id, id))
      .limit(1);
    await db.delete(bingoTile).where(eq(bingoTile.id, id));
    await logActivity({ userId: locals.user.id, type: 'tile_delete', detail: tile?.label ?? null });
    return { ok: true };
  },

  bulkAdd: async ({ request, locals }) => {
    if (!isAdmin(locals.user) || !locals.user) throw error(403, 'Admin access required');
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return fail(400, { form: 'bulkAdd', message: 'Choose a CSV file to upload.' });
    }

    const text = await file.text();
    const labels = parseLabels(text);
    if (labels.length === 0) {
      return fail(400, { form: 'bulkAdd', message: 'No labels found in file.' });
    }

    const existing = await db
      .select({ id: bingoTile.id, position: bingoTile.position })
      .from(bingoTile);
    const total = existing.length + labels.length;

    if (total < TARGET_TILES) {
      const short = TARGET_TILES - total;
      return fail(400, {
        form: 'bulkAdd',
        message: `Upload would result in ${total} tiles, short of the ${TARGET_TILES} (${GRID_SIZE}×${GRID_SIZE}) needed for a complete card. Add ${short} more row${short === 1 ? '' : 's'} to your CSV.`,
        existing: existing.length,
        incoming: labels.length,
        target: TARGET_TILES
      });
    }

    const maxPos = existing.reduce((m, t) => Math.max(m, t.position), -1);

    await db.transaction(async (tx) => {
      await tx.insert(bingoTile).values(
        labels.map((label, i) => ({
          id: randomUUID(),
          label,
          position: maxPos + 1 + i,
          isActive: true,
          isFreeSpace: false
        }))
      );
    });

    await logActivity({
      userId: locals.user.id,
      type: 'tile_bulk_add',
      detail: `${labels.length} tiles`
    });
    return { ok: true, form: 'bulkAdd', added: labels.length };
  }
};

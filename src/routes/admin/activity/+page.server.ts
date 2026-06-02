// src/routes/admin/activity/+page.server.ts
import { error, fail } from '@sveltejs/kit';
import { and, desc, eq, lt } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activityLog, user } from '$lib/server/db/schema';
import { isAdmin } from '$lib/server/admin';
import { buildActivityFilters, parsePurgeRequest } from '$lib/server/activityQuery';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, depends }) => {
  depends('app:activity');

  const { type, userId, limit } = buildActivityFilters(url.searchParams);

  const conditions = [];
  if (type) conditions.push(eq(activityLog.type, type));
  if (userId) conditions.push(eq(activityLog.userId, userId));
  const where = conditions.length ? and(...conditions) : undefined;

  const events = await db
    .select({
      id: activityLog.id,
      type: activityLog.type,
      detail: activityLog.detail,
      createdAt: activityLog.createdAt,
      userName: user.name,
      userImage: user.image
    })
    .from(activityLog)
    .innerJoin(user, eq(activityLog.userId, user.id))
    .where(where)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);

  // Distinct users that appear in the log, for the user filter dropdown.
  const users = await db
    .selectDistinct({ id: user.id, name: user.name })
    .from(activityLog)
    .innerJoin(user, eq(activityLog.userId, user.id))
    .orderBy(user.name);

  return {
    events,
    users,
    filters: { type, userId, limit },
    hasMore: events.length === limit
  };
};

export const actions: Actions = {
  purge: async ({ request, locals }) => {
    if (!isAdmin(locals.user)) throw error(403, 'Admin access required');
    const form = await request.formData();
    const req = parsePurgeRequest(
      form.get('mode')?.toString() ?? null,
      form.get('before')?.toString() ?? null
    );
    if (!req) return fail(400, { message: 'Invalid purge request' });

    if (req.mode === 'all') {
      await db.delete(activityLog);
    } else {
      await db.delete(activityLog).where(lt(activityLog.createdAt, req.before));
    }
    return { ok: true, purged: true };
  }
};

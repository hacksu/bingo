import { error } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activityLog, user } from '$lib/server/db/schema';
import { isAdmin } from '$lib/server/admin';
import { buildActivityFilters } from '$lib/server/activityQuery';
import { toCsv, toJson } from '$lib/server/activityExport';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  // The /admin layout guard does not run for standalone endpoints, so check here.
  if (!isAdmin(locals.user)) throw error(403, 'Admin access required');

  const { type, userId } = buildActivityFilters(url.searchParams);
  const format = url.searchParams.get('format') === 'json' ? 'json' : 'csv';

  const conditions = [];
  if (type) conditions.push(eq(activityLog.type, type));
  if (userId) conditions.push(eq(activityLog.userId, userId));
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({
      createdAt: activityLog.createdAt,
      userName: user.name,
      type: activityLog.type,
      detail: activityLog.detail
    })
    .from(activityLog)
    .innerJoin(user, eq(activityLog.userId, user.id))
    .where(where)
    .orderBy(desc(activityLog.createdAt));

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === 'json') {
    return new Response(toJson(rows), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="activity-${stamp}.json"`
      }
    });
  }

  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="activity-${stamp}.csv"`
    }
  });
};

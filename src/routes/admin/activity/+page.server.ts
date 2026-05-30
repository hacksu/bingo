// src/routes/admin/activity/+page.server.ts
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activityLog, user } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
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
    .orderBy(desc(activityLog.createdAt))
    .limit(200);

  return { events };
};

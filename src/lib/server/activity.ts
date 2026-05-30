// src/lib/server/activity.ts
import { randomUUID } from 'node:crypto';
import { db } from './db';
import { activityLog } from './db/schema';

export type ActivityType = 'login' | 'logout' | 'tile_complete';

/**
 * Best-effort append to the activity log. Never throws: a logging failure must not
 * break auth flows or tile toggling.
 */
export async function logActivity(input: {
  userId: string;
  type: ActivityType;
  detail?: string | null;
}): Promise<void> {
  try {
    await db.insert(activityLog).values({
      id: randomUUID(),
      userId: input.userId,
      type: input.type,
      detail: input.detail ?? null
    });
  } catch (err) {
    console.error('logActivity failed', err);
  }
}

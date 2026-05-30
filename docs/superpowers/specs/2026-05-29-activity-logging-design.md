# Activity Logging + Admin Feed - Design

Date: 2026-05-29

## Goal

Record timestamped activity events (login, logout, tile completion) to the database
and surface them in an admin-only chronological feed.

## Decisions (locked)

- Capture strategy: **server-side** (approach A). Login and logout via Better Auth
  hooks; tile completion via the existing toggle action. Nothing client-driven.
- Events captured: `login`, `logout`, `tile_complete`. **Un-marking a tile and card
  resets are NOT logged** (keeps the feed clean; matches "tile completion").
- Consumption: an **admin-only activity view**. No per-user stats or session-duration
  math in this scope.
- The admin feed shows the **most recent 200 events**, newest first.
- The log is **append-only and self-contained**: tile events store a snapshot of the
  tile label rather than a foreign key, so the history survives tile edits/deletes.

## Architecture

### 1. Data model - `activity_log`

Add to `src/lib/server/db/schema.ts`:

```ts
import { pgTable, text, timestamp, boolean, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const activityLog = pgTable(
  'activity_log',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'login' | 'logout' | 'tile_complete'
    detail: text('detail'), // tile label snapshot for tile_complete; null otherwise
    createdAt: timestamp('created_at').notNull().defaultNow() // the logged time
  },
  (t) => ({
    createdAtIdx: index('activity_log_created_at_idx').on(t.createdAt)
  })
);

export type ActivityLog = typeof activityLog.$inferSelect;
```

Notes:
- `index` must be added to the existing `drizzle-orm/pg-core` import (currently imports
  `pgTable, text, timestamp, boolean, integer, uniqueIndex`).
- `userId` cascades on user delete, consistent with `session`/`bingoProgress`.
- No `tileId` foreign key by design; `detail` holds the label snapshot.

### 2. Activity writer - `src/lib/server/activity.ts`

A single helper so every capture point writes identically and a logging failure can
never break auth or tile toggling.

```ts
import { randomUUID } from 'node:crypto';
import { db } from './db';
import { activityLog } from './db/schema';

export type ActivityType = 'login' | 'logout' | 'tile_complete';

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
```

### 3. Capture points

**Login + logout - `src/lib/server/auth.ts`:**

Both use `databaseHooks.session`. The installed `@better-auth/core` types
(`init-options.d.mts`) confirm `session.create.after` and `session.delete.after` both
exist with signature `(session: Session & Record<string, unknown>, context) => Promise<void>`,
and `Session` carries `userId`. No request middleware (`createAuthMiddleware`) is needed.

- Login: `databaseHooks.session.create.after` fires when a session row is created
  (sign-in) -> `logActivity({ userId: session.userId, type: 'login' })`.
- Logout: `databaseHooks.session.delete.after` fires when a session row is deleted.
  Better Auth's sign-out revokes (deletes) the session row, so this captures logout ->
  `logActivity({ userId: session.userId, type: 'logout' })`.

```ts
databaseHooks: {
  session: {
    create: {
      after: async (session) => {
        await logActivity({ userId: session.userId, type: 'login' });
      }
    },
    delete: {
      after: async (session) => {
        await logActivity({ userId: session.userId, type: 'logout' });
      }
    }
  }
}
```

Caveats (acceptable for this scope, noted for awareness):
- `session.create.after` fires on session creation. With Better Auth defaults, session
  refresh updates `expiresAt` (an update, not a create), so `create` ~ sign-in.
- `session.delete.after` fires on any session deletion, including lazy cleanup of an
  expired session on a later request. That records a `logout` at cleanup time rather
  than at the user's explicit sign-out. This is acceptable for a coarse activity feed.

**Tile completion - `src/routes/bingo/+page.server.ts` (toggle action):**

- The action's tile lookup currently selects `{ isActive, isFreeSpace }`. Add `label`
  to that select so the snapshot is available.
- In the branch where a tile is **newly inserted** into `bingoProgress` (not the delete
  branch), after the insert call:
  `await logActivity({ userId: locals.user.id, type: 'tile_complete', detail: tile.label });`
- Do NOT log on the un-mark (delete) branch or in the `reset` action.

### 4. Admin activity view

**Route:** `src/routes/admin/activity/+page.server.ts` and `+page.svelte`. Auth is
handled by `hooks.server.ts`, which already gates everything under `/admin`.

**Load (`+page.server.ts`):**

```ts
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
```

**UI (`+page.svelte`):** reverse-chronological feed mirroring the existing admin
responsive pattern (mobile stacked cards, `sm:` and up a table). Columns: time
(`toLocaleString`), player (avatar + name, with initials fallback for null image),
event. Event rendering:
- `login` -> "Signed in" (slate/neutral badge)
- `logout` -> "Signed out" (slate/neutral badge)
- `tile_complete` -> `Completed "<detail>"` (emerald badge)

Empty state when there are no events.

**Nav:** add an "Activity" link to `src/routes/admin/+layout.svelte` next to
Users/Tiles:

```svelte
<a href="/admin/activity" class="text-slate-300 hover:text-white transition">Activity</a>
```

## Data flow

```
Sign-in  -> Better Auth creates session -> session.create.after -> logActivity(login)
Sign-out -> Better Auth deletes session  -> session.delete.after -> logActivity(logout)
Mark tile -> toggle action inserts bingoProgress -> logActivity(tile_complete, label)

Admin opens /admin/activity -> select last 200 joined to user, desc -> feed
```

## Error handling

- `logActivity` swallows and logs its own errors; auth flows and tile toggling proceed
  regardless of logging success.
- The admin load uses `innerJoin` on `user`; cascade delete keeps the log consistent
  (no orphan rows referencing a missing user).
- `detail` is nullable; the UI only reads it for `tile_complete`.

## Migration

Apply the new table with the project's existing flow: `bun run db:push` (local DB up
first via `docker compose up -d db`). In Docker: `docker compose exec app bun run db:push`.

## Testing

No automated tests (vitest intentionally excluded). Manual verification:

- Sign in -> exactly one `login` row appears for the user.
- Mark a tile -> one `tile_complete` row with the tile's label in `detail`; un-marking
  it adds no row.
- Sign out -> one `logout` row.
- `/admin/activity` lists events newest-first, shows player + event, is reachable only
  by admins (non-admin or logged-out users are redirected/403 by the existing guard).

## Out of scope

- Session-duration or time-to-complete computation, per-user stats/analytics.
- Pagination or filtering beyond the fixed 200-event cap.
- Logging un-marks, resets, or admin verify/unverify actions.
- Any non-admin visibility of the log.

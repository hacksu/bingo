# Activity Logging + Admin Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record login, logout, and tile-completion events with timestamps and show them in an admin-only chronological feed.

**Architecture:** A single append-only `activity_log` table. A `logActivity` helper writes rows. Login/logout are captured via Better Auth `databaseHooks.session.create.after` / `delete.after`; tile completion via the existing bingo `toggle` action. An admin route reads the most recent 200 rows joined to `user`.

**Tech Stack:** SvelteKit 2 (Svelte 5), Drizzle ORM + Postgres, Better Auth 1.1.13, Tailwind CSS v4, Bun.

> **Project rules (override skill defaults):**
> - **No git commits.** The agent never runs `git commit`. Each task ends at a **Checkpoint** for the user to review and commit manually.
> - **No automated tests in this plan.** Vitest is intentionally excluded. Verification is `bun run check` plus the manual DB checks given in each task. DB-dependent checks require a running Postgres (`docker compose up -d db`) and the schema applied (`bun run db:push`); where a step needs that, it is marked **(needs DB)**.

**Spec:** `docs/superpowers/specs/2026-05-29-activity-logging-design.md`

**Current branch:** `feat/activity-logging` (carries the uncommitted leaderboard work).

---

## File Structure

- Modify: `src/lib/server/db/schema.ts` - add `index` to the pg-core import; add `activityLog` table + `ActivityLog` type.
- Create: `src/lib/server/activity.ts` - `logActivity()` writer helper.
- Modify: `src/lib/server/auth.ts` - add `databaseHooks.session.create.after` (login) and `delete.after` (logout).
- Modify: `src/routes/bingo/+page.server.ts` - select tile `label`; log `tile_complete` on new mark.
- Create: `src/routes/admin/activity/+page.server.ts` - load last 200 events joined to user.
- Create: `src/routes/admin/activity/+page.svelte` - chronological feed UI.
- Modify: `src/routes/admin/+layout.svelte` - add "Activity" nav link.

**Suggested execution waves** (disjoint files, dependency-ordered):
- Wave 1: Task 1 (schema), Task 6 (nav link) - independent.
- Wave 2: Task 2 (activity helper), Task 5 (admin route) - both need Task 1, disjoint.
- Wave 3: Task 3 (auth hooks), Task 4 (toggle) - both need Task 2, disjoint.

---

## Task 1: `activity_log` schema

**Files:**
- Modify: `src/lib/server/db/schema.ts`

- [ ] **Step 1: Add `index` to the pg-core import**

Change the first line of `src/lib/server/db/schema.ts` from:

```ts
import { pgTable, text, timestamp, boolean, integer, uniqueIndex } from 'drizzle-orm/pg-core';
```

to:

```ts
import { pgTable, text, timestamp, boolean, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';
```

- [ ] **Step 2: Append the `activityLog` table and type**

Add to the END of `src/lib/server/db/schema.ts` (after the existing `BingoProgress` type export):

```ts
// ─── Activity log ───────────────────────────────────────────────────────────

export const activityLog = pgTable(
  'activity_log',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'login' | 'logout' | 'tile_complete'
    detail: text('detail'), // tile label snapshot for tile_complete; null otherwise
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (t) => ({
    createdAtIdx: index('activity_log_created_at_idx').on(t.createdAt)
  })
);

export type ActivityLog = typeof activityLog.$inferSelect;
```

- [ ] **Step 3: Type-check**

Run: `bun run check`
Expected: PASS, no errors in `schema.ts`. (If a transient OneDrive `.svelte-kit/types` lock appears, re-run once.)

- [ ] **Step 4: Apply schema (needs DB)**

If a local DB is running, run: `bun run db:push`
Expected: drizzle-kit reports creating table `activity_log`. If no DB is available now, skip and note that `db:push` must be run before the feature is exercised.

- [ ] **Step 5: Checkpoint** - review the schema diff. Commit if desired.

---

## Task 2: `logActivity` writer helper

**Files:**
- Create: `src/lib/server/activity.ts`

Depends on Task 1 (imports `activityLog`).

- [ ] **Step 1: Write the helper**

```ts
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
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: PASS, no errors referencing `activity.ts`. (Not imported yet.)

- [ ] **Step 3: Checkpoint** - review the helper. Commit if desired.

---

## Task 3: Capture login + logout in Better Auth

**Files:**
- Modify: `src/lib/server/auth.ts`

Depends on Task 2. The installed `@better-auth/core` types confirm `databaseHooks.session.create.after` and `databaseHooks.session.delete.after` exist with signature `(session, context) => Promise<void>`, and `session.userId` is available.

- [ ] **Step 1: Add the import**

At the top of `src/lib/server/auth.ts`, add after the existing imports:

```ts
import { logActivity } from './activity';
```

- [ ] **Step 2: Add the `databaseHooks` option**

In the `betterAuth({ ... })` config object, add a `databaseHooks` property (place it right after the `database: drizzleAdapter(...)` line, keeping the trailing comma correct):

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
  },
```

The resulting config should read (for orientation):

```ts
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  databaseHooks: {
    session: {
      create: { after: async (session) => { await logActivity({ userId: session.userId, type: 'login' }); } },
      delete: { after: async (session) => { await logActivity({ userId: session.userId, type: 'logout' }); } }
    }
  },
  baseURL: env.BETTER_AUTH_URL,
  // ...rest unchanged
});
```

(Format the nested hooks readably as in Step 2; the one-line form above is only to show placement.)

- [ ] **Step 3: Type-check**

Run: `bun run check`
Expected: PASS. If TypeScript complains that `session.userId` is unknown, hover/inspect the parameter type in `node_modules/@better-auth/core/dist/types/init-options.d.mts` (the `session` hook param is `Session & Record<string, unknown>`); `userId` is a `Session` field. Do not cast unless genuinely required.

- [ ] **Step 4: Manual verify (needs DB)**

With `docker compose up -d db`, schema applied, and `bun run dev`: sign in, then query `select type, user_id, created_at from activity_log order by created_at desc limit 5;`. Expect a `login` row. Sign out and re-query: expect a `logout` row.

- [ ] **Step 5: Checkpoint** - review the auth diff. Commit if desired.

---

## Task 4: Log tile completion in the toggle action

**Files:**
- Modify: `src/routes/bingo/+page.server.ts`

Depends on Task 2.

- [ ] **Step 1: Add the import**

At the top of `src/routes/bingo/+page.server.ts`, add after the existing imports:

```ts
import { logActivity } from '$lib/server/activity';
```

- [ ] **Step 2: Select the tile `label` in the toggle action**

In the `toggle` action, change the tile lookup from:

```ts
    const [tile] = await db
      .select({ isActive: bingoTile.isActive, isFreeSpace: bingoTile.isFreeSpace })
      .from(bingoTile)
      .where(eq(bingoTile.id, tileId))
      .limit(1);
```

to:

```ts
    const [tile] = await db
      .select({ label: bingoTile.label, isActive: bingoTile.isActive, isFreeSpace: bingoTile.isFreeSpace })
      .from(bingoTile)
      .where(eq(bingoTile.id, tileId))
      .limit(1);
```

- [ ] **Step 3: Log on the new-mark branch**

In the same action, find the branch that inserts a new progress row:

```ts
    await db.insert(bingoProgress).values({
      id: randomUUID(),
      userId: locals.user.id,
      tileId
    });

    return { ok: true, completed: true };
```

Change it to:

```ts
    await db.insert(bingoProgress).values({
      id: randomUUID(),
      userId: locals.user.id,
      tileId
    });

    await logActivity({ userId: locals.user.id, type: 'tile_complete', detail: tile.label });

    return { ok: true, completed: true };
```

Do NOT add logging to the un-mark (delete) branch or to the `reset` action.

- [ ] **Step 4: Type-check**

Run: `bun run check`
Expected: PASS, no errors in `bingo/+page.server.ts`.

- [ ] **Step 5: Manual verify (needs DB)**

With the app running and signed in, mark a tile, then query `select type, detail, created_at from activity_log order by created_at desc limit 3;`. Expect a `tile_complete` row whose `detail` is the tile's label. Un-mark the same tile and re-query: no new row added.

- [ ] **Step 6: Checkpoint** - review the diff. Commit if desired.

---

## Task 5: Admin activity feed route

**Files:**
- Create: `src/routes/admin/activity/+page.server.ts`
- Create: `src/routes/admin/activity/+page.svelte`

Depends on Task 1 (imports `activityLog`). The `/admin` guard in `hooks.server.ts` already restricts this route to admins.

- [ ] **Step 1: Write the load**

```ts
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
```

- [ ] **Step 2: Write the page UI**

```svelte
<!-- src/routes/admin/activity/+page.svelte -->
<script lang="ts">
  let { data } = $props();

  function initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  function when(d: Date | string): string {
    return new Date(d).toLocaleString();
  }

  function label(type: string, detail: string | null): string {
    if (type === 'login') return 'Signed in';
    if (type === 'logout') return 'Signed out';
    if (type === 'tile_complete') return `Completed "${detail ?? ''}"`;
    return type;
  }

  function badgeClass(type: string): string {
    return type === 'tile_complete'
      ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200'
      : 'bg-white/5 border border-white/10 text-slate-300';
  }
</script>

<header class="space-y-1 text-center">
  <h1 class="text-3xl font-extrabold tracking-tight">Activity</h1>
  <p class="text-sm text-slate-300">{data.events.length} most recent events</p>
</header>

{#if data.events.length === 0}
  <p class="rounded-lg border border-white/10 bg-white/5 px-4 py-8 text-center text-slate-300">
    No activity yet.
  </p>
{:else}
  <!-- Mobile: stacked cards -->
  <div class="sm:hidden space-y-3">
    {#each data.events as e (e.id)}
      <div class="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
        <div class="flex items-center gap-3">
          {#if e.userImage}
            <img src={e.userImage} alt="" class="h-9 w-9 shrink-0 rounded-full object-cover" />
          {:else}
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-slate-200"
            >
              {initials(e.userName)}
            </span>
          {/if}
          <div class="min-w-0 flex-1">
            <div class="truncate font-semibold text-slate-100">{e.userName}</div>
            <div class="text-xs text-slate-400">{when(e.createdAt)}</div>
          </div>
        </div>
        <div class="mt-2">
          <span class="rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide {badgeClass(e.type)}">
            {label(e.type, e.detail)}
          </span>
        </div>
      </div>
    {/each}
  </div>

  <!-- Desktop: table -->
  <div class="hidden sm:block overflow-x-auto rounded-lg border border-white/10 bg-white/5">
    <table class="w-full text-sm">
      <thead class="bg-white/5 text-left text-slate-300 uppercase text-xs tracking-wider">
        <tr>
          <th class="px-4 py-2">Time</th>
          <th class="px-4 py-2">Player</th>
          <th class="px-4 py-2">Event</th>
        </tr>
      </thead>
      <tbody>
        {#each data.events as e (e.id)}
          <tr class="border-t border-white/10 hover:bg-white/5">
            <td class="px-4 py-2 whitespace-nowrap text-slate-300">{when(e.createdAt)}</td>
            <td class="px-4 py-2">
              <div class="flex items-center gap-3 min-w-0">
                {#if e.userImage}
                  <img src={e.userImage} alt="" class="h-8 w-8 shrink-0 rounded-full object-cover" />
                {:else}
                  <span
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-slate-200"
                  >
                    {initials(e.userName)}
                  </span>
                {/if}
                <span class="truncate font-semibold text-slate-100">{e.userName}</span>
              </div>
            </td>
            <td class="px-4 py-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide {badgeClass(e.type)}">
                {label(e.type, e.detail)}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
```

- [ ] **Step 3: Type-check**

Run: `bun run check`
Expected: PASS, no errors in either new file.

- [ ] **Step 4: Manual verify (needs DB)**

As an admin, open `/admin/activity`. Confirm events render newest-first with player avatar/name, a formatted timestamp, and the correct event label/badge. Confirm a logged-out user hitting `/admin/activity` is redirected to `/login` and a non-admin gets the 403 (existing guard behavior).

- [ ] **Step 5: Checkpoint** - review both files. Commit if desired.

---

## Task 6: "Activity" nav link

**Files:**
- Modify: `src/routes/admin/+layout.svelte`

Independent of the other tasks.

- [ ] **Step 1: Add the link**

In `src/routes/admin/+layout.svelte`, in the `<nav>`, add an Activity link after the Tiles link. Change:

```svelte
    <a href="/admin" class="text-slate-300 hover:text-white transition">Users</a>
    <a href="/admin/tiles" class="text-slate-300 hover:text-white transition">Tiles</a>
```

to:

```svelte
    <a href="/admin" class="text-slate-300 hover:text-white transition">Users</a>
    <a href="/admin/tiles" class="text-slate-300 hover:text-white transition">Tiles</a>
    <a href="/admin/activity" class="text-slate-300 hover:text-white transition">Activity</a>
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: PASS.

- [ ] **Step 3: Manual verify**

As an admin, confirm the "Activity" link appears in the admin nav and navigates to `/admin/activity`.

- [ ] **Step 4: Checkpoint** - review the diff. Commit if desired.

---

## Final verification

- [ ] `bun run check` passes with no errors.
- [ ] **(needs DB)** `bun run db:push` applied the `activity_log` table.
- [ ] **(needs DB)** Sign in -> `login` row; mark a tile -> `tile_complete` row with label; sign out -> `logout` row.
- [ ] **(needs DB)** `/admin/activity` shows events newest-first, is admin-gated, and un-marking a tile adds no row.

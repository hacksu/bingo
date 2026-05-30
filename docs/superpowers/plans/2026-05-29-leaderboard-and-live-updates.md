# Public Leaderboard + Live Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fully public, mobile-first `/leaderboard` and live (polling) updates to both the leaderboard and the admin dashboard.

**Architecture:** Extract the admin dashboard's per-user completion/bingo computation into a shared `src/lib/server/standings.ts`. The new public leaderboard route and the refactored admin load both consume it. A small Svelte 5 runes helper (`livePoll`) polls `invalidate(key)` on a 5s interval, scoped per page via `depends`, paused while the tab is hidden.

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), Drizzle ORM + Postgres, Tailwind CSS v4, Bun.

> **Project rules (override skill defaults):**
> - **No git commits.** The agent never runs `git commit`. Each task ends at a **Checkpoint** - a stop point for the user to review and commit manually if they choose.
> - **No automated tests in this plan.** Vitest was intentionally scoped out. Verification is `bun run check` (svelte-check) plus the manual browser checks given in each task.

**Spec:** `docs/superpowers/specs/2026-05-29-leaderboard-and-live-updates-design.md`

---

## File Structure

- Create: `src/lib/server/standings.ts` - `loadStandings()`, the shared read-only standings computation.
- Create: `src/lib/livePoll.svelte.ts` - `livePoll(key, intervalMs?)` runes helper for visibility-aware polling.
- Create: `src/routes/leaderboard/+page.server.ts` - public load: filter + rank standings.
- Create: `src/routes/leaderboard/+page.svelte` - public, mobile-first leaderboard UI.
- Modify: `src/routes/admin/+page.server.ts` - use `loadStandings`, add `depends('app:admin')`.
- Modify: `src/routes/admin/+page.svelte` - wire `livePoll('app:admin')`.
- Modify: `src/routes/+layout.svelte` - add public "Leaderboard" nav link (desktop + mobile).

---

## Task 1: Shared standings module

**Files:**
- Create: `src/lib/server/standings.ts`

This lifts the computation currently inline in `src/routes/admin/+page.server.ts:7-50` into a reusable, presentation-free module. `completed` stays as the raw self-marked progress-row count so the admin display is byte-for-byte unchanged.

- [ ] **Step 1: Write the module**

```ts
// src/lib/server/standings.ts
import { db } from './db';
import { bingoProgress, bingoTile, user } from './db/schema';
import { detectBingo } from '$lib/bingo';
import { shuffleTilesForUser } from './cardShuffle';

export type UserStanding = {
  id: string;
  name: string;
  image: string | null;
  role: string;
  completed: number; // count of the player's self-marked progress rows
  hasBingo: boolean; // detectBingo() on their seeded card
  verifiedAt: Date | null; // bingoVerifiedAt
};

export type StandingsResult = {
  standings: UserStanding[]; // name-sorted; consumers apply their own ranking
  tileCount: number; // total tiles in the pool
  lockedCount: number; // tiles with isActive = false
};

export async function loadStandings(): Promise<StandingsResult> {
  const tiles = await db
    .select({
      id: bingoTile.id,
      position: bingoTile.position,
      isFreeSpace: bingoTile.isFreeSpace,
      isActive: bingoTile.isActive
    })
    .from(bingoTile);

  const allProgress = await db
    .select({ userId: bingoProgress.userId, tileId: bingoProgress.tileId })
    .from(bingoProgress);

  const users = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
      role: user.role,
      cardSeed: user.cardSeed,
      bingoVerifiedAt: user.bingoVerifiedAt
    })
    .from(user);

  const completedByUser = new Map<string, Set<string>>();
  for (const p of allProgress) {
    let s = completedByUser.get(p.userId);
    if (!s) {
      s = new Set<string>();
      completedByUser.set(p.userId, s);
    }
    s.add(p.tileId);
  }

  const standings: UserStanding[] = users
    .map((u) => {
      const completedIds = completedByUser.get(u.id) ?? new Set<string>();
      const ordered = shuffleTilesForUser(tiles, u.cardSeed);
      const positions = new Set<number>();
      ordered.forEach((t, idx) => {
        if (completedIds.has(t.id) || t.isFreeSpace) positions.add(idx);
      });
      const { hasBingo } = detectBingo(positions);
      return {
        id: u.id,
        name: u.name,
        image: u.image,
        role: u.role,
        completed: completedIds.size,
        hasBingo,
        verifiedAt: u.bingoVerifiedAt
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    standings,
    tileCount: tiles.length,
    lockedCount: tiles.filter((t) => !t.isActive).length
  };
}
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: PASS - no errors referencing `standings.ts`. (The module is not imported anywhere yet; this just confirms it compiles.)

- [ ] **Step 3: Checkpoint** - review `src/lib/server/standings.ts`. Commit if desired.

---

## Task 2: Refactor admin dashboard load to use `loadStandings`

**Files:**
- Modify: `src/routes/admin/+page.server.ts` (full rewrite of the file)

The returned `users` rows keep the exact same fields and the same sort as before, so `src/routes/admin/+page.svelte` needs no changes. Adds `depends('app:admin')` for later polling.

- [ ] **Step 1: Replace the file contents**

```ts
// src/routes/admin/+page.server.ts
import { loadStandings } from '$lib/server/standings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ depends }) => {
  depends('app:admin');
  const { standings, tileCount, lockedCount } = await loadStandings();

  const rows = standings.map((u) => {
    const verified = u.verifiedAt !== null;
    return {
      id: u.id,
      name: u.name,
      image: u.image,
      role: u.role,
      completed: u.completed,
      hasBingo: u.hasBingo,
      verified,
      verifiedAt: u.verifiedAt,
      sortRank: u.hasBingo && !verified ? 2 : u.hasBingo && verified ? 1 : 0
    };
  });

  rows.sort(
    (a, b) => b.sortRank - a.sortRank || b.completed - a.completed || a.name.localeCompare(b.name)
  );

  return {
    users: rows,
    tileCount,
    lockedCount,
    pendingCount: rows.filter((r) => r.hasBingo && !r.verified).length,
    verifiedCount: rows.filter((r) => r.verified).length
  };
};
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: PASS - no errors in `admin/+page.server.ts` or `admin/+page.svelte`.

- [ ] **Step 3: Manual verify (admin unchanged)**

Run the app (`bun run dev`), sign in as an admin, open `/admin`. Confirm the Users table/cards render exactly as before: player names, role pills, `X / <tileCount>` progress, BINGO/VERIFIED badges, and the same ordering (pending bingos on top).

- [ ] **Step 4: Checkpoint** - review the diff. Commit if desired.

---

## Task 3: Visibility-aware polling helper

**Files:**
- Create: `src/lib/livePoll.svelte.ts`

Must be a `.svelte.ts` file so Svelte 5 runes (`$effect`) are compiled. Call it once at the top of a component's `<script>` (component-init context).

- [ ] **Step 1: Write the helper**

```ts
// src/lib/livePoll.svelte.ts
import { invalidate } from '$app/navigation';

/**
 * Re-runs the load that called `depends(key)` on an interval, but only while the
 * browser tab is visible. Pauses on tab hide (battery/data on mobile) and fires one
 * immediate refresh when the tab becomes visible again.
 *
 * Call ONCE at component init (top of <script>); the $effect handles teardown.
 */
export function livePoll(key: string, intervalMs = 5000) {
  $effect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer === null) timer = setInterval(() => invalidate(key), intervalMs);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        invalidate(key); // immediate catch-up on return
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });
}
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: PASS - no errors. (Not imported yet.)

- [ ] **Step 3: Checkpoint** - review the helper. Commit if desired.

---

## Task 4: Leaderboard server load (filter + rank)

**Files:**
- Create: `src/routes/leaderboard/+page.server.ts`

Public route (no `locals.user` use). Verified winners pinned on top by finish time; everyone else by completion then name; zero-progress users hidden. `depends('app:standings')` enables polling.

- [ ] **Step 1: Write the load**

```ts
// src/routes/leaderboard/+page.server.ts
import { loadStandings } from '$lib/server/standings';
import { GRID_SIZE } from '$lib/bingo';
import type { PageServerLoad } from './$types';

const MARKABLE = GRID_SIZE * GRID_SIZE - 1; // 24 markable cells (free space excluded)

export const load: PageServerLoad = async ({ depends }) => {
  depends('app:standings');
  const { standings } = await loadStandings();

  const visible = standings.filter((s) => s.completed > 0 || s.verifiedAt !== null);

  const verified = visible
    .filter((s) => s.verifiedAt !== null)
    .sort((a, b) => a.verifiedAt!.getTime() - b.verifiedAt!.getTime());

  const rest = visible
    .filter((s) => s.verifiedAt === null)
    .sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name));

  const players = [...verified, ...rest].map((s, i) => ({
    rank: i + 1,
    name: s.name,
    image: s.image,
    completed: Math.min(s.completed, MARKABLE),
    verifiedAt: s.verifiedAt
  }));

  return { players, markable: MARKABLE };
};
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: PASS. (Page component comes next; a missing `+page.svelte` does not fail the check.)

- [ ] **Step 3: Checkpoint** - review the load. Commit if desired.

---

## Task 5: Leaderboard page UI (mobile-first)

**Files:**
- Create: `src/routes/leaderboard/+page.svelte`

Mobile = stacked cards (primary). `sm:` and up = table wrapped in `overflow-x-auto`. Avatars fixed-size, names truncate. Tolerates `image == null` via initials fallback. Polling is wired in Task 6.

- [ ] **Step 1: Write the component**

```svelte
<!-- src/routes/leaderboard/+page.svelte -->
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

  function finishTime(d: Date | string): string {
    return new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
</script>

<section class="mx-auto max-w-3xl space-y-6">
  <header class="space-y-1 text-center">
    <h1 class="text-3xl font-extrabold tracking-tight">Leaderboard</h1>
    <p class="text-sm text-slate-300">
      {data.players.length} player{data.players.length === 1 ? '' : 's'} in the running
    </p>
  </header>

  {#if data.players.length === 0}
    <p class="rounded-lg border border-white/10 bg-white/5 px-4 py-8 text-center text-slate-300">
      No progress yet. Be the first to mark a tile!
    </p>
  {:else}
    <!-- Mobile: stacked cards -->
    <div class="sm:hidden space-y-3">
      {#each data.players as p (p.rank)}
        <div
          class="flex items-center gap-3 rounded-lg border px-4 py-3 {p.verifiedAt
            ? 'bg-emerald-400/5 border-emerald-400/20'
            : 'bg-white/5 border-white/10'}"
        >
          <span class="w-6 shrink-0 text-center font-bold text-slate-400">{p.rank}</span>
          {#if p.image}
            <img src={p.image} alt="" class="h-9 w-9 shrink-0 rounded-full object-cover" />
          {:else}
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-slate-200"
            >
              {initials(p.name)}
            </span>
          {/if}
          <div class="min-w-0 flex-1">
            <div class="truncate font-semibold text-slate-100">{p.name}</div>
            <div class="text-xs text-slate-400">{p.completed} / {data.markable}</div>
          </div>
          {#if p.verifiedAt}
            <span
              class="shrink-0 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-2 py-0.5 text-xs font-semibold tracking-wide"
            >
              {finishTime(p.verifiedAt)}
            </span>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Desktop: table -->
    <div class="hidden sm:block overflow-x-auto rounded-lg border border-white/10 bg-white/5">
      <table class="w-full text-sm">
        <thead class="bg-white/5 text-left text-slate-300 uppercase text-xs tracking-wider">
          <tr>
            <th class="px-4 py-2 w-12">#</th>
            <th class="px-4 py-2">Player</th>
            <th class="px-4 py-2">Progress</th>
            <th class="px-4 py-2 text-right">Finished</th>
          </tr>
        </thead>
        <tbody>
          {#each data.players as p (p.rank)}
            <tr
              class="border-t border-white/10 {p.verifiedAt
                ? 'bg-emerald-400/5 hover:bg-emerald-400/10'
                : 'hover:bg-white/5'}"
            >
              <td class="px-4 py-2 font-bold text-slate-400">{p.rank}</td>
              <td class="px-4 py-2">
                <div class="flex items-center gap-3 min-w-0">
                  {#if p.image}
                    <img src={p.image} alt="" class="h-8 w-8 shrink-0 rounded-full object-cover" />
                  {:else}
                    <span
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-slate-200"
                    >
                      {initials(p.name)}
                    </span>
                  {/if}
                  <span class="truncate font-semibold text-slate-100">{p.name}</span>
                </div>
              </td>
              <td class="px-4 py-2 text-slate-200">{p.completed} / {data.markable}</td>
              <td class="px-4 py-2 text-right">
                {#if p.verifiedAt}
                  <span
                    class="rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-2 py-0.5 text-xs font-semibold tracking-wide"
                  >
                    {finishTime(p.verifiedAt)}
                  </span>
                {:else}
                  <span class="text-slate-500">·</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: PASS - no errors in `leaderboard/+page.svelte`.

- [ ] **Step 3: Manual verify (public + mobile)**

With `bun run dev` running:
1. Open `/leaderboard` in a **logged-out** browser/incognito window - it must load (no redirect to `/login`).
2. Confirm players with progress appear; a verified player (set `bingo_verified_at` on a user in the DB if needed) sorts above higher-completion-but-unverified players and shows a finish time.
3. Confirm zero-progress users are absent.
4. Toggle the browser devtools to a ~375px viewport: rows render as stacked cards, no horizontal page scroll, long names truncate, avatars stay round and undistorted.

- [ ] **Step 4: Checkpoint** - review the page. Commit if desired.

---

## Task 6: Wire live polling into leaderboard and admin

**Files:**
- Modify: `src/routes/leaderboard/+page.svelte` (add to `<script>`)
- Modify: `src/routes/admin/+page.svelte` (add to `<script>`)

- [ ] **Step 1: Add polling to the leaderboard script**

In `src/routes/leaderboard/+page.svelte`, change the top of `<script lang="ts">` from:

```svelte
<script lang="ts">
  let { data } = $props();
```

to:

```svelte
<script lang="ts">
  import { livePoll } from '$lib/livePoll.svelte';

  let { data } = $props();

  livePoll('app:standings');
```

- [ ] **Step 2: Add polling to the admin script**

In `src/routes/admin/+page.svelte`, change the top of `<script lang="ts">` from:

```svelte
<script lang="ts">
  let { data } = $props();
</script>
```

to:

```svelte
<script lang="ts">
  import { livePoll } from '$lib/livePoll.svelte';

  let { data } = $props();

  livePoll('app:admin');
</script>
```

- [ ] **Step 3: Type-check**

Run: `bun run check`
Expected: PASS.

- [ ] **Step 4: Manual verify (live + visibility pause)**

With `bun run dev` running and two browser windows:
1. Window A: `/leaderboard`. Window B: sign in, `/bingo`, mark a tile. Within ~5s Window A reflects the new completion count without a manual refresh.
2. Open `/admin` as admin in one tab; in another, create/advance a bingo. The admin Users list updates within ~5s.
3. In devtools (Network or a `console.log` temporarily added to the helper if you like), switch the leaderboard tab to background - confirm polling stops - then foreground it and confirm an immediate refresh fires.

- [ ] **Step 5: Checkpoint** - review the diffs. Commit if desired.

---

## Task 7: Public "Leaderboard" nav link

**Files:**
- Modify: `src/routes/+layout.svelte`

The leaderboard is public, so the link shows for everyone (logged in or not), in both the desktop nav and the mobile bar.

- [ ] **Step 1: Add the desktop link**

In `src/routes/+layout.svelte`, inside the desktop `<nav class="hidden sm:flex items-center gap-4 text-sm">`, add a Leaderboard link as the first child (before the `{#if data.user}` block):

```svelte
      <nav class="hidden sm:flex items-center gap-4 text-sm">
        <a href="/leaderboard" class="hover:text-white text-slate-300 transition">Leaderboard</a>
        {#if data.user}
```

- [ ] **Step 2: Add the mobile link**

In the same file, inside `<div class="sm:hidden flex gap-2 px-6 pb-3">`, add a Leaderboard link as the first child (before the `{#if data.user}` block):

```svelte
  <div class="sm:hidden flex gap-2 px-6 pb-3">
    <a
      href="/leaderboard"
      class="flex-1 text-center rounded-md bg-white/5 border border-white/10 text-slate-300 hover:text-white px-3 py-1.5 text-sm font-medium transition"
    >
      Leaderboard
    </a>
    {#if data.user}
```

- [ ] **Step 3: Type-check**

Run: `bun run check`
Expected: PASS.

- [ ] **Step 4: Manual verify (nav, both states)**

With `bun run dev`: logged out, confirm the "Leaderboard" link appears in the header (desktop) and in the mobile bar at ~375px, and navigates to `/leaderboard`. Logged in, confirm it still appears alongside "My Card"/"Sign out".

- [ ] **Step 5: Checkpoint** - review the diff. Commit if desired.

---

## Final verification

- [ ] `bun run check` passes with no errors or new warnings.
- [ ] `/leaderboard` loads logged-out, ranks correctly (verified-by-finish-time on top, then by completion), hides zero-progress users, and is clean at 375px.
- [ ] Leaderboard and admin both update within ~5s of a change and pause when their tab is hidden.
- [ ] `/admin` output is unchanged from before the refactor.

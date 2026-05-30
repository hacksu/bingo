# Public Leaderboard + Live Updates — Design

Date: 2026-05-29

## Goal

Add two things to HACKSU Bingo:

1. A **fully public leaderboard** (`/leaderboard`, no login) that ranks players by
   progress and surfaces verified bingo winners in finish order.
2. **Live updates via polling** on both the leaderboard and the existing admin
   dashboard, so a projected screen stays current without manual refresh.

## Decisions (locked)

- Leaderboard is **fully public** — no auth gate.
- Each row shows **avatar + display name**.
- Ranking uses **tiles completed** plus **verified bingo time** (`bingoVerifiedAt`).
- "Time of bingo" = **verified time only**. Self-marked completion is game-able and
  is not used as the winner signal. No new timestamp column.
- Live updates use **polling** (not SSE/WebSockets): robust behind Dokploy's proxy,
  survives multiple app instances, no in-process pub/sub.
- Both leaderboard and admin dashboard update live.
- **No cap** on board size — show every player with progress.
- **Mobile-first / responsive**, consistent with the project's existing mobile support:
  the leaderboard and the live-update behavior must work well on phone-sized viewports,
  not just desktop/projector.

## Architecture

### 1. Shared standings module — `src/lib/server/standings.ts`

`src/routes/admin/+page.server.ts` already computes per-user completion + bingo
state. Extract that core into a reusable server module so the public board and the
admin dashboard can never drift in how they count.

```ts
export type UserStanding = {
  id: string;
  name: string;
  image: string | null;
  role: string;
  completed: number;        // count of the player's self-marked progress rows
  hasBingo: boolean;        // detectBingo() on their seeded card
  verifiedAt: Date | null;  // bingoVerifiedAt
};

export type StandingsResult = {
  standings: UserStanding[];  // name-sorted; consumers apply their own ranking
  tileCount: number;          // total tiles in the pool
  lockedCount: number;        // tiles with isActive = false
};

export async function loadStandings(): Promise<StandingsResult>;
```

Implementation (lifted from the current admin load):

- Select tiles (`id, position, isFreeSpace, isActive`), all `bingoProgress`
  (`userId, tileId`), and users (`id, name, image, role, cardSeed, bingoVerifiedAt`).
- Build `completedByUser: Map<userId, Set<tileId>>` from progress.
- For each user: `shuffleTilesForUser(tiles, cardSeed)`, mark positions where the
  tile is self-marked or a free space, run `detectBingo`.
- `completed` = size of the user's progress set (unchanged from today's admin value,
  so the admin display is byte-for-byte identical).

`loadStandings` returns a name-sorted `standings` array plus the tile counts both pages
need; each consumer applies its own ranking and derived fields. This keeps the module
free of presentation concerns and avoids querying the tile table twice.

### 2. Admin dashboard refactor — `src/routes/admin/+page.server.ts`

Replace the inline computation with a call to `loadStandings()`. The admin load then
layers on its existing derived data on top of the returned standings:

- `sortRank` (pending bingo > verified > none), then the existing sort.
- Summary counts: `tileCount`, `lockedCount`, `pendingCount`, `verifiedCount`.

`tileCount` / `lockedCount` still come from the tiles query — to keep those, either
have `loadStandings` also return the tile list, or run the (cheap) tile count in the
admin load separately. Chosen: `loadStandings` returns `{ standings, tileCount,
lockedCount }` so the tiles aren't queried twice. The admin page's rendered output and
`{u.completed} / {data.tileCount}` display are unchanged.

### 3. Public leaderboard route — `src/routes/leaderboard/`

`+page.server.ts`:

- `load` calls `depends('app:standings')` then `loadStandings()`.
- Filter: keep users where `completed > 0` OR `verifiedAt != null` (no wall of empty
  rows on a fresh screen).
- Ranking — single ordered list, two groups concatenated:
  1. **Verified winners**: `verifiedAt != null`, sorted by `verifiedAt` ascending
     (earliest finisher = rank 1).
  2. **Everyone else**: sorted by `completed` descending, then `name` ascending.
- Returns rows with `{ id, name, image, completed, verifiedAt }` and a 1-based `rank`
  derived from final position. No `cardSeed`, `role`, or other internal fields leak to
  the public page.

`+page.svelte` (mobile-first, matching the project's existing responsive pattern):

- Reuses the HACKSU dark Tailwind styling and the responsive card/table split from
  `admin/+page.svelte`: **stacked cards by default (mobile), `sm:` and up becomes a
  table**. The mobile card is the primary layout, not an afterthought.
- Columns / card fields: rank, avatar + name, completed count, finish time (verified only).
- Avatars are fixed-size and `name` truncates (`truncate` / `min-w-0`) so long Discord
  names don't break the narrow mobile card.
- Verified rows get the emerald "VERIFIED" treatment and a finish timestamp; the top
  finisher(s) can carry a subtle rank emphasis.
- Completion shown as `N / 24` (markable cells = `GRID_SIZE² − 1`, free space excluded),
  clamped so a stale-pool edge case can't render `> 24`.
- The desktop table is wrapped in `overflow-x-auto` (as the admin table is) so it never
  forces horizontal page scroll on small screens at the `sm:` breakpoint.
- Page is reachable without login; it does not assume `locals.user`.

### 4. Live updates — polling

A small reusable client helper keeps both pages DRY:

`src/lib/livePoll.ts` (or inline in each page) exposing a Svelte 5 `$effect` that:

- Calls `invalidate(key)` on an interval (default **5000 ms**).
- Clears the interval on teardown.
- Pauses while the tab is hidden (`document.visibilitychange` → only poll when
  `visibilityState === 'visible'`), and fires one immediate refresh on becoming
  visible again.

Wiring:

- Leaderboard `load` → `depends('app:standings')`; page polls `invalidate('app:standings')`.
- Admin `load` → `depends('app:admin')`; page polls `invalidate('app:admin')`.
- Using scoped `depends` keys (not `invalidateAll`) means only the page's own load
  re-runs — the root layout and auth session check are not re-fetched each tick.
- **Mobile consideration**: pausing on `visibilitychange` matters most on phones —
  it stops polling (and battery/data drain) when the user backgrounds the tab or locks
  the screen, and resumes with one immediate refresh on return.

## Data flow

```
Browser (leaderboard, every 5s while visible)
  → invalidate('app:standings')
  → re-run /leaderboard load
  → loadStandings()  ── 3 selects + per-user shuffle/detectBingo
  → filter + rank
  → render
```

Admin dashboard is identical with key `app:admin` and its extra summary counts.

## Error handling

- `loadStandings` performs read-only queries; on DB error the SvelteKit load throws and
  the framework renders its error page. Polling simply retries on the next tick.
- A failed `invalidate` (e.g. transient network) is swallowed by the next interval; no
  user-facing error spam from background polling.
- Leaderboard must tolerate users with `image == null` (fallback avatar/initials) and
  must never dereference `locals.user`.

## Testing

Tests were scoped out of this change. The extracted `loadStandings` ranking/filtering is
pure enough to unit-test later (vitest) if desired; for now the work is verified manually:

- Public `/leaderboard` loads while logged out.
- A verified player appears above higher-completion-but-unverified players, with finish
  time, ordered by verification time.
- Zero-progress users are hidden.
- Admin dashboard output is unchanged after the refactor.
- Marking a tile in one tab reflects on the leaderboard within ~5s; backgrounding the
  tab pauses polling.
- Mobile viewport (~375px): leaderboard renders as stacked cards with no horizontal
  page scroll; long names truncate; avatars don't distort. Admin views remain usable on
  mobile after the refactor.

## Out of scope

- No SSE/WebSocket realtime.
- No new schema columns or migrations.
- No vitest suite (separate, previously-deferred task).
- No board-size cap, pagination, or per-player drill-down on the public page.

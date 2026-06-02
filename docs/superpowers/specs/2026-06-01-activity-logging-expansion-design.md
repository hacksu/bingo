# Activity Logging Expansion — Design

Date: 2026-06-01

## Background

The app already has an append-only activity log:

- `activity_log` table: `id`, `user_id` (FK → user, cascade), `type` (free text), `detail` (nullable text), `created_at` (indexed).
- `logActivity({ userId, type, detail })` in `src/lib/server/activity.ts` — best-effort, swallows its own errors so logging never breaks auth or gameplay.
- Currently captures `login`, `logout`, `tile_complete`.
- Admin feed at `/admin/activity` loads the latest 200 events joined to `user`, no controls.

This design expands the log in three directions: more event types, a better admin feed (filter / paginate / live), and export + purge. It deliberately avoids richer per-event metadata (no IP/user-agent, no JSON detail, no schema migration).

## Goals

1. Capture more player and admin actions.
2. Make the admin feed filterable, paginated, and live-updating.
3. Allow admins to export the (filtered) log and purge old entries.

## Non-goals

- No `target_user_id` column or structured JSON detail. Admin-action targets are stored as plain text in `detail`.
- No automatic retention/pruning on a schedule.
- No IP address, user agent, or other request metadata.

## 1. New event types

The `type` column remains free text. The `ActivityType` union in `src/lib/server/activity.ts` is expanded so call sites are type-checked:

```ts
export type ActivityType =
  | 'login'
  | 'logout'
  | 'tile_complete'
  | 'tile_uncomplete'
  | 'bingo_win'
  | 'card_reshuffle'
  | 'admin_verify'
  | 'admin_unverify'
  | 'admin_reset'
  | 'tile_create'
  | 'tile_update'
  | 'tile_delete'
  | 'tile_bulk_add';
```

For category-based UI (filter grouping, badge styling), a helper maps each type to a category:

| Category | Types |
|----------|-------|
| Auth | `login`, `logout` |
| Play | `tile_complete`, `tile_uncomplete`, `card_reshuffle` |
| Wins | `bingo_win` |
| Admin | `admin_verify`, `admin_unverify`, `admin_reset`, `tile_create`, `tile_update`, `tile_delete`, `tile_bulk_add` |

### Where each event is logged

| Type | Location | `userId` | `detail` |
|------|----------|----------|----------|
| `tile_uncomplete` | `bingo/+page.server.ts` `toggle`, delete branch | player | tile label |
| `bingo_win` | `bingo/+page.server.ts` `toggle`, after insert | player | winning line description (e.g. `Row 3`) |
| `card_reshuffle` | `bingo/+page.server.ts` `reset` | player | null |
| `admin_verify` | `admin/users/[id]/+page.server.ts` `verify` | admin | target user name |
| `admin_unverify` | `admin/users/[id]/+page.server.ts` `unverify` | admin | target user name |
| `admin_reset` | `admin/users/[id]/+page.server.ts` `reset` | admin | target user name |
| `tile_create` | `admin/tiles/+page.server.ts` `create` | admin | tile label |
| `tile_update` | `admin/tiles/+page.server.ts` `update` | admin | tile label |
| `tile_delete` | `admin/tiles/+page.server.ts` `delete` | admin | tile label |
| `tile_bulk_add` | `admin/tiles/+page.server.ts` `bulkAdd` | admin | count added (e.g. `42 tiles`) |

Notes:

- `tile_complete` stays where it is.
- For admin actions, the actor (`userId`) is the admin; the affected user/tile is named in `detail`. Admin user-action handlers already load the target row, so the target name is available (or one extra small select where it is not).
- For `tile_update` / `tile_delete`, the label is fetched/known in the action before mutating so it can be recorded.

### Bingo win detection

The `toggle` action does not currently run `detectBingo`. To log `bingo_win` exactly once (on the transition into a bingo, not on every later tile):

1. After inserting the new `bingoProgress` row, load the player's tiles + completed set and compute `completedPositions` (same logic as the page `load`).
2. Run `detectBingo(completedPositions)` → `afterHasBingo`.
3. Compute the "before" set by removing the just-added tile's position, run `detectBingo` → `beforeHasBingo`.
4. If `afterHasBingo && !beforeHasBingo`, call `logActivity({ type: 'bingo_win', detail: <line desc> })`.

The winning line description is derived from `winningPositions` (e.g. which row/column/diagonal). If a precise description is awkward, fall back to `detail: null` and a generic "Bingo!" label in the UI; correctness of the single-fire transition is the priority.

All new `logActivity` calls follow the existing best-effort contract: a logging failure must never fail the action.

## 2. Admin feed UI

File: `src/routes/admin/activity/+page.server.ts` and `+page.svelte`.

### Filtering

- URL query params drive the query: `?type=<type>&user=<userId>`.
- `load` parses params, builds `where` conditions, and returns the filtered, ordered, limited rows plus the option lists for the controls.
- Type control: a `<select>` grouped by category (Auth / Play / Wins / Admin) with an "All" default.
- User control: a `<select>` populated from the distinct users that appear in the log (`select distinct user join`), with an "All" default.
- Changing a control updates the URL (client-side navigation), which re-runs `load`.

### Pagination

- A `limit` query param, default 200, with a "Load more" control that increases it (200 → 400 → …).
- `load` applies `.limit(limit)`. The response includes whether more rows likely exist (e.g. returned count === limit) to decide whether to show "Load more".
- Growing-limit is chosen over cursors because it composes cleanly with live polling (each poll re-fetches the current top-N) and the data volume is small for an admin tool.

### Live updates

- `load` calls `depends('app:activity')`.
- `+page.svelte` calls `livePoll('app:activity')` once at init (existing leaderboard pattern). On each interval the load re-runs with the current URL params, so new matching events appear at the top.

### Rendering

- `label(type, detail)` and `badgeClass(type)` are extended to cover all new types, using the category mapping for badge colors.
- The existing mobile-card / desktop-table layouts are reused; only the controls bar (filters, export buttons, purge, load-more) is added above the list.

## 3. Export and purge

### Export

- New endpoint: `src/routes/admin/activity/export/+server.ts`, `GET`.
- Admin-only (reuse `isAdmin(locals.user)`; 403 otherwise).
- Query params: `format=csv|json` plus the same `type` / `user` filters as the feed. No `limit` — exports the full filtered set (ordered newest first).
- CSV columns: `created_at`, `user_name`, `type`, `detail`. JSON: array of the same fields.
- Response sets `Content-Disposition: attachment` with a sensible filename (e.g. `activity-YYYY-MM-DD.csv`).
- The feed shows two buttons (CSV / JSON) that link to this endpoint with the current filter params appended.

### Purge

- A `purge` form action on `admin/activity/+page.server.ts`, admin-only.
- Modes:
  - Clear all: deletes every row.
  - Clear older-than: a date input; deletes rows with `created_at < chosen date`.
- The UI requires an explicit confirmation step before submitting (e.g. a confirm dialog or a slide-to-confirm control, consistent with the existing `SlideToConfirm` component if suitable).
- Purge itself is an admin action; whether to log the purge is a minor open point (see below).

## Data flow summary

```
Player marks tile   -> toggle insert  -> logActivity(tile_complete)
                                       -> detect transition -> logActivity(bingo_win) [once]
Player unmarks tile -> toggle delete  -> logActivity(tile_uncomplete)
Player resets card  -> reset          -> logActivity(card_reshuffle)
Admin verify/reset  -> users/[id]     -> logActivity(admin_*, detail = target name)
Admin edits tiles   -> tiles actions  -> logActivity(tile_*, detail = label/count)

Admin feed   -> load(type,user,limit) + depends('app:activity') + livePoll
Export       -> GET /admin/activity/export?format&type&user  (full filtered set)
Purge        -> action purge(all | older-than date)
```

## Error handling

- All `logActivity` calls are best-effort and never throw (unchanged contract).
- Export and purge enforce `isAdmin`; non-admins get 403.
- Filter params are validated/sanitized in `load`; unknown values fall back to "All".

## Testing

- Unit: bingo-win transition logic (false→true fires once; staying in bingo does not re-fire; losing and regaining fires again).
- Unit: filter `where`-clause construction for type/user/limit and the older-than purge predicate.
- Unit: CSV/JSON serialization of a sample row set.
- Manual: feed filtering, load-more, live update, CSV/JSON download, purge-all and purge-older-than with confirmation.

## Open points (minor, default chosen)

- Winning-line description for `bingo_win`: implement if straightforward, else `null` + generic "Bingo!" label.
- Logging the purge action itself: default to NOT logging it (purge is about clearing the log; a surviving self-entry is confusing). Revisit if an audit trail of purges is wanted.

# Activity Logging Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the existing activity log with more event types, a filterable/paginated/live admin feed, and CSV/JSON export plus manual purge.

**Architecture:** New event types reuse the existing best-effort `logActivity` writer and the free-text `type`/`detail` columns (no schema migration). Pure, testable logic (event metadata, bingo-win transition, filter parsing, export serialization) lives in small focused modules covered by vitest. Server actions/endpoints and Svelte UI wire those helpers in; UI/DB wiring is verified by `svelte-check` and manual testing.

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), Drizzle ORM + Postgres, Better Auth, Bun, TailwindCSS, vitest (added in Task 1).

> **Commits:** This repo's owner controls all commits (do NOT run `git commit`). Each task ends with a verification checkpoint; stage changes if you like, but leave committing to the user.

---

## File Structure

**New (pure, unit-tested):**
- `src/lib/activityMeta.ts` — canonical `ActivityType` union, category mapping, display labels, badge classes, type groups. Shared client + server.
- `src/lib/server/activityQuery.ts` — `buildActivityFilters(URLSearchParams)` and `parsePurgeRequest(...)`.
- `src/lib/server/activityExport.ts` — `toCsv(rows)` / `toJson(rows)`.

**New (wiring):**
- `src/routes/admin/activity/export/+server.ts` — admin-only GET export endpoint.
- Test files: `src/lib/activityMeta.test.ts`, `src/lib/bingo.test.ts`, `src/lib/server/activityQuery.test.ts`, `src/lib/server/activityExport.test.ts`.
- `vitest.config.ts`.

**Modified:**
- `src/lib/bingo.ts` — add `describeWinLine` + `bingoWinTransition` pure helpers.
- `src/lib/server/activity.ts` — re-export expanded `ActivityType` from `activityMeta`.
- `src/routes/bingo/+page.server.ts` — log `tile_uncomplete`, `bingo_win`, `card_reshuffle`.
- `src/routes/admin/users/[id]/+page.server.ts` — log `admin_verify` / `admin_unverify` / `admin_reset`.
- `src/routes/admin/tiles/+page.server.ts` — log `tile_create` / `tile_update` / `tile_delete` / `tile_bulk_add`.
- `src/routes/admin/activity/+page.server.ts` — filters, growing limit, `depends`, distinct-user list, `purge` action.
- `src/routes/admin/activity/+page.svelte` — filter/export/purge controls, live poll, new labels/badges.
- `package.json` — add `test` scripts + vitest devDependency.

---

## Task 1: Set up vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts + devDependencies)

- [ ] **Step 1: Install vitest**

Run: `bun add -d vitest`
Expected: vitest added under devDependencies in `package.json`.

- [ ] **Step 2: Create standalone vitest config**

The unit-tested modules import nothing from `$lib`/`$env`, so a plain config (no SvelteKit plugin) is enough and avoids alias/runtime complications. Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node'
  }
});
```

- [ ] **Step 3: Add test scripts**

In `package.json` `scripts`, add:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: Add a smoke test and run it**

Create `src/lib/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('vitest', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `bun run test`
Expected: 1 passing test.

- [ ] **Step 5: Remove the smoke test**

Delete `src/lib/smoke.test.ts` (it was only to prove the harness works).

- [ ] **Step 6: Checkpoint** — `bun run test` exits cleanly (no test files now, or 0 failures). Leave committing to the user.

---

## Task 2: Activity metadata module

**Files:**
- Create: `src/lib/activityMeta.ts`
- Test: `src/lib/activityMeta.test.ts`
- Modify: `src/lib/server/activity.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/activityMeta.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_TYPES,
  TYPE_GROUPS,
  TYPE_LABEL,
  categoryOf,
  eventLabel,
  badgeClass
} from './activityMeta';

describe('categoryOf', () => {
  it('maps known types to categories', () => {
    expect(categoryOf('login')).toBe('auth');
    expect(categoryOf('tile_complete')).toBe('play');
    expect(categoryOf('bingo_win')).toBe('wins');
    expect(categoryOf('admin_reset')).toBe('admin');
  });

  it('returns "other" for unknown types', () => {
    expect(categoryOf('something_else')).toBe('other');
  });
});

describe('eventLabel', () => {
  it('formats player events', () => {
    expect(eventLabel('tile_complete', 'Wear a hat')).toBe('Completed "Wear a hat"');
    expect(eventLabel('tile_uncomplete', 'Wear a hat')).toBe('Un-marked "Wear a hat"');
    expect(eventLabel('card_reshuffle', null)).toBe('Reshuffled card');
    expect(eventLabel('bingo_win', 'Row 3')).toBe('Bingo! (Row 3)');
    expect(eventLabel('bingo_win', null)).toBe('Bingo!');
  });

  it('formats admin events with the target in detail', () => {
    expect(eventLabel('admin_verify', 'Alice')).toBe('Verified Alice');
    expect(eventLabel('admin_reset', 'Alice')).toBe("Reset Alice's board");
  });

  it('falls back to the raw type for unknown types', () => {
    expect(eventLabel('mystery', null)).toBe('mystery');
  });
});

describe('completeness', () => {
  it('every type has a category, label, and badge class', () => {
    for (const t of ACTIVITY_TYPES) {
      expect(categoryOf(t)).not.toBe('other');
      expect(TYPE_LABEL[t]).toBeTruthy();
      expect(badgeClass(t)).toMatch(/border/);
    }
  });

  it('TYPE_GROUPS covers exactly the full type set', () => {
    const grouped = TYPE_GROUPS.flatMap((g) => g.types).sort();
    expect(grouped).toEqual([...ACTIVITY_TYPES].sort());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/lib/activityMeta.test.ts`
Expected: FAIL — cannot resolve `./activityMeta`.

- [ ] **Step 3: Implement the module**

Create `src/lib/activityMeta.ts`:

```ts
export type ActivityCategory = 'auth' | 'play' | 'wins' | 'admin';

export const ACTIVITY_TYPES = [
  'login',
  'logout',
  'tile_complete',
  'tile_uncomplete',
  'card_reshuffle',
  'bingo_win',
  'admin_verify',
  'admin_unverify',
  'admin_reset',
  'tile_create',
  'tile_update',
  'tile_delete',
  'tile_bulk_add'
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

const CATEGORY: Record<ActivityType, ActivityCategory> = {
  login: 'auth',
  logout: 'auth',
  tile_complete: 'play',
  tile_uncomplete: 'play',
  card_reshuffle: 'play',
  bingo_win: 'wins',
  admin_verify: 'admin',
  admin_unverify: 'admin',
  admin_reset: 'admin',
  tile_create: 'admin',
  tile_update: 'admin',
  tile_delete: 'admin',
  tile_bulk_add: 'admin'
};

export const TYPE_LABEL: Record<ActivityType, string> = {
  login: 'Login',
  logout: 'Logout',
  tile_complete: 'Tile completed',
  tile_uncomplete: 'Tile un-marked',
  card_reshuffle: 'Card reshuffle',
  bingo_win: 'Bingo win',
  admin_verify: 'Admin: verify',
  admin_unverify: 'Admin: un-verify',
  admin_reset: 'Admin: reset board',
  tile_create: 'Admin: create tile',
  tile_update: 'Admin: edit tile',
  tile_delete: 'Admin: delete tile',
  tile_bulk_add: 'Admin: bulk add tiles'
};

export const TYPE_GROUPS: { label: string; category: ActivityCategory; types: ActivityType[] }[] = [
  { label: 'Auth', category: 'auth', types: ['login', 'logout'] },
  { label: 'Play', category: 'play', types: ['tile_complete', 'tile_uncomplete', 'card_reshuffle'] },
  { label: 'Wins', category: 'wins', types: ['bingo_win'] },
  {
    label: 'Admin',
    category: 'admin',
    types: ['admin_verify', 'admin_unverify', 'admin_reset', 'tile_create', 'tile_update', 'tile_delete', 'tile_bulk_add']
  }
];

export function categoryOf(type: string): ActivityCategory | 'other' {
  return (CATEGORY as Record<string, ActivityCategory>)[type] ?? 'other';
}

export function eventLabel(type: string, detail: string | null): string {
  switch (type) {
    case 'login':
      return 'Signed in';
    case 'logout':
      return 'Signed out';
    case 'tile_complete':
      return `Completed "${detail ?? ''}"`;
    case 'tile_uncomplete':
      return `Un-marked "${detail ?? ''}"`;
    case 'card_reshuffle':
      return 'Reshuffled card';
    case 'bingo_win':
      return detail ? `Bingo! (${detail})` : 'Bingo!';
    case 'admin_verify':
      return `Verified ${detail ?? 'a player'}`;
    case 'admin_unverify':
      return `Un-verified ${detail ?? 'a player'}`;
    case 'admin_reset':
      return `Reset ${detail ?? 'a player'}'s board`;
    case 'tile_create':
      return `Created tile "${detail ?? ''}"`;
    case 'tile_update':
      return `Edited tile "${detail ?? ''}"`;
    case 'tile_delete':
      return `Deleted tile "${detail ?? ''}"`;
    case 'tile_bulk_add':
      return `Bulk-added ${detail ?? ''}`;
    default:
      return type;
  }
}

export function badgeClass(type: string): string {
  switch (categoryOf(type)) {
    case 'wins':
      return 'bg-amber-500/20 border border-amber-400/40 text-amber-200';
    case 'play':
      return 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200';
    case 'admin':
      return 'bg-sky-500/20 border border-sky-400/40 text-sky-200';
    case 'auth':
    default:
      return 'bg-white/5 border border-white/10 text-slate-300';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/lib/activityMeta.test.ts`
Expected: PASS.

- [ ] **Step 5: Re-export the type from the writer module**

In `src/lib/server/activity.ts`, replace the local union with a re-export so `activityMeta` is the single source of truth. Change the top of the file:

Old:
```ts
export type ActivityType = 'login' | 'logout' | 'tile_complete';
```

New:
```ts
import type { ActivityType } from '$lib/activityMeta';
export type { ActivityType };
```

Leave the rest of `activity.ts` unchanged (the `logActivity` body still references `input.type` etc.).

- [ ] **Step 6: Type-check**

Run: `bun run check`
Expected: no new errors from `activity.ts` / `activityMeta.ts`.

- [ ] **Step 7: Checkpoint** — tests pass, `check` clean.

---

## Task 3: Bingo win transition helpers

**Files:**
- Modify: `src/lib/bingo.ts`
- Test: `src/lib/bingo.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/bingo.test.ts`. Recall the 5×5 layout: positions `0..24`, row `r` is `[5r..5r+4]`, column `c` is `[c, c+5, c+10, c+15, c+20]`, main diagonal `[0,6,12,18,24]`, anti-diagonal `[4,8,12,16,20]`.

```ts
import { describe, expect, it } from 'vitest';
import { describeWinLine, bingoWinTransition } from './bingo';

describe('describeWinLine', () => {
  it('names rows, columns, and diagonals', () => {
    expect(describeWinLine([0, 1, 2, 3, 4])).toBe('Row 1');
    expect(describeWinLine([10, 11, 12, 13, 14])).toBe('Row 3');
    expect(describeWinLine([2, 7, 12, 17, 22])).toBe('Column 3');
    expect(describeWinLine([0, 6, 12, 18, 24])).toBe('Diagonal ↘');
    expect(describeWinLine([4, 8, 12, 16, 20])).toBe('Diagonal ↗');
  });
});

describe('bingoWinTransition', () => {
  const row1 = new Set([0, 1, 2, 3]); // row 1 missing position 4

  it('fires once when a line is completed', () => {
    const before = row1;
    const after = new Set([0, 1, 2, 3, 4]);
    expect(bingoWinTransition(before, after)).toEqual({ justWon: true, lineLabel: 'Row 1' });
  });

  it('does not fire when already in bingo and another tile is marked', () => {
    const before = new Set([0, 1, 2, 3, 4]); // already row 1
    const after = new Set([0, 1, 2, 3, 4, 7]);
    expect(bingoWinTransition(before, after)).toEqual({ justWon: false, lineLabel: null });
  });

  it('does not fire when no line is complete', () => {
    const before = new Set([0, 1]);
    const after = new Set([0, 1, 2]);
    expect(bingoWinTransition(before, after)).toEqual({ justWon: false, lineLabel: null });
  });

  it('fires again after losing and regaining a bingo', () => {
    // Lost: dropped from a full row back to partial
    const before = new Set([0, 1, 2, 3]);
    const after = new Set([0, 1, 2, 3, 4]);
    expect(bingoWinTransition(before, after).justWon).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/lib/bingo.test.ts`
Expected: FAIL — `describeWinLine`/`bingoWinTransition` are not exported.

- [ ] **Step 3: Implement the helpers**

Append to `src/lib/bingo.ts` (after `detectBingo`):

```ts
export function describeWinLine(line: number[]): string {
  const rows = line.map((p) => Math.floor(p / GRID_SIZE));
  const cols = line.map((p) => p % GRID_SIZE);
  if (rows.every((r) => r === rows[0])) return `Row ${rows[0] + 1}`;
  if (cols.every((c) => c === cols[0])) return `Column ${cols[0] + 1}`;
  if (line.every((p, i) => p === i * GRID_SIZE + i)) return 'Diagonal ↘';
  return 'Diagonal ↗';
}

/**
 * Detects the moment a player crosses into a bingo. Returns justWon=true only on
 * the false -> true transition, so marking further tiles while already winning
 * does not re-fire. lineLabel describes the first newly-completed line.
 */
export function bingoWinTransition(
  before: Set<number>,
  after: Set<number>
): { justWon: boolean; lineLabel: string | null } {
  const beforeRes = detectBingo(before);
  const afterRes = detectBingo(after);
  if (!afterRes.hasBingo || beforeRes.hasBingo) {
    return { justWon: false, lineLabel: null };
  }
  const beforeKeys = new Set(beforeRes.winningLines.map((l) => l.join(',')));
  const newLine = afterRes.winningLines.find((l) => !beforeKeys.has(l.join(',')));
  return { justWon: true, lineLabel: newLine ? describeWinLine(newLine) : null };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/lib/bingo.test.ts`
Expected: PASS.

- [ ] **Step 5: Checkpoint** — tests pass.

---

## Task 4: Filter and purge parsing

**Files:**
- Create: `src/lib/server/activityQuery.ts`
- Test: `src/lib/server/activityQuery.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/server/activityQuery.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildActivityFilters, parsePurgeRequest, DEFAULT_LIMIT, MAX_LIMIT } from './activityQuery';

const params = (q: string) => new URLSearchParams(q);

describe('buildActivityFilters', () => {
  it('defaults to no filters and the default limit', () => {
    expect(buildActivityFilters(params(''))).toEqual({
      type: null,
      userId: null,
      limit: DEFAULT_LIMIT
    });
  });

  it('accepts a known type and a user id', () => {
    expect(buildActivityFilters(params('type=bingo_win&user=abc123'))).toEqual({
      type: 'bingo_win',
      userId: 'abc123',
      limit: DEFAULT_LIMIT
    });
  });

  it('rejects an unknown type', () => {
    expect(buildActivityFilters(params('type=not_a_type')).type).toBeNull();
  });

  it('clamps the limit to MAX_LIMIT and ignores junk', () => {
    expect(buildActivityFilters(params('limit=999999')).limit).toBe(MAX_LIMIT);
    expect(buildActivityFilters(params('limit=abc')).limit).toBe(DEFAULT_LIMIT);
    expect(buildActivityFilters(params('limit=-5')).limit).toBe(DEFAULT_LIMIT);
    expect(buildActivityFilters(params('limit=400')).limit).toBe(400);
  });
});

describe('parsePurgeRequest', () => {
  it('parses purge-all', () => {
    expect(parsePurgeRequest('all', null)).toEqual({ mode: 'all' });
  });

  it('parses purge-older with a valid date', () => {
    const result = parsePurgeRequest('older', '2026-01-01');
    expect(result).not.toBeNull();
    expect(result && result.mode).toBe('older');
    expect(result && 'before' in result && result.before instanceof Date).toBe(true);
  });

  it('rejects older without a date or with an invalid date', () => {
    expect(parsePurgeRequest('older', null)).toBeNull();
    expect(parsePurgeRequest('older', 'not-a-date')).toBeNull();
  });

  it('rejects unknown modes', () => {
    expect(parsePurgeRequest('nuke', null)).toBeNull();
    expect(parsePurgeRequest(null, null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/lib/server/activityQuery.test.ts`
Expected: FAIL — cannot resolve `./activityQuery`.

- [ ] **Step 3: Implement the module**

Create `src/lib/server/activityQuery.ts`:

```ts
import { ACTIVITY_TYPES } from '$lib/activityMeta';

export type ActivityFilters = {
  type: string | null;
  userId: string | null;
  limit: number;
};

export const DEFAULT_LIMIT = 200;
export const LIMIT_STEP = 200;
export const MAX_LIMIT = 5000;

export function buildActivityFilters(params: URLSearchParams): ActivityFilters {
  const typeRaw = params.get('type');
  const type = typeRaw && (ACTIVITY_TYPES as readonly string[]).includes(typeRaw) ? typeRaw : null;

  const userRaw = params.get('user');
  const userId = userRaw && userRaw.length > 0 ? userRaw : null;

  const limitRaw = Number(params.get('limit'));
  const limit =
    Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, MAX_LIMIT) : DEFAULT_LIMIT;

  return { type, userId, limit };
}

export type PurgeRequest = { mode: 'all' } | { mode: 'older'; before: Date };

export function parsePurgeRequest(
  mode: string | null,
  before: string | null
): PurgeRequest | null {
  if (mode === 'all') return { mode: 'all' };
  if (mode === 'older') {
    if (!before) return null;
    const d = new Date(before);
    if (Number.isNaN(d.getTime())) return null;
    return { mode: 'older', before: d };
  }
  return null;
}
```

Note: this file imports from `$lib/activityMeta`. Since the test imports it through the same alias-free relative path and `activityMeta` itself has no `$lib`/`$env` imports, vitest resolves it via the standalone config only if the `$lib` alias is available. If the test fails to resolve `$lib`, add an alias to `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { $lib: path.resolve('./src/lib') } },
  test: { include: ['src/**/*.test.ts'], environment: 'node' }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/lib/server/activityQuery.test.ts`
Expected: PASS. If it failed on `$lib` resolution, apply the alias above and re-run.

- [ ] **Step 5: Checkpoint** — tests pass.

---

## Task 5: Export serialization

**Files:**
- Create: `src/lib/server/activityExport.ts`
- Test: `src/lib/server/activityExport.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/server/activityExport.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { toCsv, toJson, type ExportRow } from './activityExport';

const rows: ExportRow[] = [
  { createdAt: '2026-06-01T12:00:00.000Z', userName: 'Alice', type: 'bingo_win', detail: 'Row 3' },
  { createdAt: '2026-06-01T12:01:00.000Z', userName: 'Bob, Jr', type: 'tile_complete', detail: 'Say "hi"' },
  { createdAt: '2026-06-01T12:02:00.000Z', userName: 'Cleo', type: 'login', detail: null }
];

describe('toCsv', () => {
  it('writes a header and one row per event', () => {
    const lines = toCsv(rows).split('\n');
    expect(lines[0]).toBe('created_at,user_name,type,detail');
    expect(lines).toHaveLength(4);
  });

  it('quotes cells containing commas, quotes, or newlines', () => {
    const csv = toCsv(rows);
    expect(csv).toContain('"Bob, Jr"');
    expect(csv).toContain('"Say ""hi"""');
  });

  it('renders null detail as an empty cell', () => {
    const last = toCsv(rows).split('\n')[3];
    expect(last.endsWith(',')).toBe(true);
  });
});

describe('toJson', () => {
  it('emits an array of normalized rows', () => {
    const parsed = JSON.parse(toJson(rows));
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual({
      createdAt: '2026-06-01T12:00:00.000Z',
      userName: 'Alice',
      type: 'bingo_win',
      detail: 'Row 3'
    });
    expect(parsed[2].detail).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/lib/server/activityExport.test.ts`
Expected: FAIL — cannot resolve `./activityExport`.

- [ ] **Step 3: Implement the module**

Create `src/lib/server/activityExport.ts`:

```ts
export type ExportRow = {
  createdAt: Date | string;
  userName: string;
  type: string;
  detail: string | null;
};

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: ExportRow[]): string {
  const lines = ['created_at,user_name,type,detail'];
  for (const r of rows) {
    lines.push(
      [
        new Date(r.createdAt).toISOString(),
        csvCell(r.userName),
        csvCell(r.type),
        csvCell(r.detail ?? '')
      ].join(',')
    );
  }
  return lines.join('\n');
}

export function toJson(rows: ExportRow[]): string {
  return JSON.stringify(
    rows.map((r) => ({
      createdAt: new Date(r.createdAt).toISOString(),
      userName: r.userName,
      type: r.type,
      detail: r.detail ?? null
    })),
    null,
    2
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/lib/server/activityExport.test.ts`
Expected: PASS.

- [ ] **Step 5: Checkpoint** — all unit tests pass: `bun run test`.

---

## Task 6: Log player events (un-complete, bingo win, reshuffle)

**Files:**
- Modify: `src/routes/bingo/+page.server.ts`

No new unit tests (DB/action wiring; the pure win logic is already covered by Task 3). Verified by `svelte-check` + manual play.

- [ ] **Step 1: Add a board-positions helper**

In `src/routes/bingo/+page.server.ts`, add this helper near the top (after the existing `ensureCardSeed` function). It mirrors the `load` logic to produce the set of completed grid positions for a user:

```ts
async function boardPositions(userId: string): Promise<{
  ordered: { id: string; isFreeSpace: boolean }[];
  positions: Set<number>;
}> {
  const tiles = await db
    .select({ id: bingoTile.id, position: bingoTile.position, isFreeSpace: bingoTile.isFreeSpace })
    .from(bingoTile)
    .orderBy(bingoTile.position);
  const [u] = await db
    .select({ cardSeed: user.cardSeed })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  const progress = await db
    .select({ tileId: bingoProgress.tileId })
    .from(bingoProgress)
    .where(eq(bingoProgress.userId, userId));
  const completed = new Set(progress.map((p) => p.tileId));
  const ordered = shuffleTilesForUser(tiles, u?.cardSeed ?? null);
  const positions = new Set<number>();
  ordered.forEach((t, idx) => {
    if (completed.has(t.id) || t.isFreeSpace) positions.add(idx);
  });
  return { ordered, positions };
}
```

- [ ] **Step 2: Import the win helper**

At the top of the file, update the bingo import to include `bingoWinTransition`:

Old:
```ts
import { detectBingo } from '$lib/bingo';
```

New:
```ts
import { detectBingo, bingoWinTransition } from '$lib/bingo';
```

- [ ] **Step 3: Log tile_uncomplete in the delete branch**

In the `toggle` action, the `if (existing.length)` branch deletes progress and returns. Add a log call after the delete, before `return`:

Old:
```ts
    if (existing.length) {
      await db
        .delete(bingoProgress)
        .where(and(eq(bingoProgress.userId, locals.user.id), eq(bingoProgress.tileId, tileId)));
      return { ok: true, completed: false };
    }
```

New:
```ts
    if (existing.length) {
      await db
        .delete(bingoProgress)
        .where(and(eq(bingoProgress.userId, locals.user.id), eq(bingoProgress.tileId, tileId)));
      await logActivity({ userId: locals.user.id, type: 'tile_uncomplete', detail: tile.label });
      return { ok: true, completed: false };
    }
```

- [ ] **Step 4: Log bingo_win after the insert branch**

After the existing `tile_complete` log in the insert branch, compute the transition and log a win when crossing into bingo:

Old:
```ts
    await logActivity({ userId: locals.user.id, type: 'tile_complete', detail: tile.label });

    return { ok: true, completed: true };
```

New:
```ts
    await logActivity({ userId: locals.user.id, type: 'tile_complete', detail: tile.label });

    const { ordered, positions } = await boardPositions(locals.user.id);
    const toggledIdx = ordered.findIndex((t) => t.id === tileId);
    if (toggledIdx >= 0) {
      const before = new Set(positions);
      before.delete(toggledIdx);
      const { justWon, lineLabel } = bingoWinTransition(before, positions);
      if (justWon) {
        await logActivity({ userId: locals.user.id, type: 'bingo_win', detail: lineLabel });
      }
    }

    return { ok: true, completed: true };
```

- [ ] **Step 5: Log card_reshuffle on self-reset**

The `reset` action regenerates the seed (a reshuffle). Add a log call:

Old:
```ts
  reset: async ({ locals }) => {
    if (!locals.user) throw error(401, 'Unauthorized');
    await resetUserBoard(locals.user.id, true);
    return { ok: true, reset: true };
  }
```

New:
```ts
  reset: async ({ locals }) => {
    if (!locals.user) throw error(401, 'Unauthorized');
    await resetUserBoard(locals.user.id, true);
    await logActivity({ userId: locals.user.id, type: 'card_reshuffle' });
    return { ok: true, reset: true };
  }
```

- [ ] **Step 6: Type-check**

Run: `bun run check`
Expected: no errors in `bingo/+page.server.ts`.

- [ ] **Step 7: Checkpoint** — `check` clean.

---

## Task 7: Log admin user actions

**Files:**
- Modify: `src/routes/admin/users/[id]/+page.server.ts`

- [ ] **Step 1: Import logActivity**

At the top of the file, add:

```ts
import { logActivity } from '$lib/server/activity';
```

- [ ] **Step 2: Log admin_verify**

In the `verify` action, the target is selected as `{ id, cardSeed }`. Add `name` to that select and log after the update:

Old:
```ts
    const [target] = await db
      .select({ id: user.id, cardSeed: user.cardSeed })
      .from(user)
      .where(eq(user.id, params.id))
      .limit(1);
    if (!target) return fail(404, { message: 'User not found' });
```

New:
```ts
    const [target] = await db
      .select({ id: user.id, name: user.name, cardSeed: user.cardSeed })
      .from(user)
      .where(eq(user.id, params.id))
      .limit(1);
    if (!target) return fail(404, { message: 'User not found' });
```

Then, at the end of `verify`, after the `db.update(...)` that sets `bingoVerifiedAt` and before `return { ok: true, verified: true };`:

```ts
    await logActivity({ userId: locals.user.id, type: 'admin_verify', detail: target.name });
```

(`locals.user` is already narrowed non-null by the `if (!locals.user) throw error(403, ...)` guard just above that update.)

- [ ] **Step 3: Log admin_unverify**

The `unverify` action currently does not select the target. Add a name lookup and log. Replace the body:

Old:
```ts
  unverify: async ({ params, locals }) => {
    if (!isAdmin(locals.user)) throw error(403, 'Admin access required');
    await db
      .update(user)
      .set({ bingoVerifiedAt: null, bingoVerifiedBy: null, updatedAt: new Date() })
      .where(eq(user.id, params.id));
    return { ok: true, verified: false };
  },
```

New:
```ts
  unverify: async ({ params, locals }) => {
    if (!isAdmin(locals.user) || !locals.user) throw error(403, 'Admin access required');
    const [target] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, params.id))
      .limit(1);
    await db
      .update(user)
      .set({ bingoVerifiedAt: null, bingoVerifiedBy: null, updatedAt: new Date() })
      .where(eq(user.id, params.id));
    await logActivity({ userId: locals.user.id, type: 'admin_unverify', detail: target?.name ?? null });
    return { ok: true, verified: false };
  },
```

- [ ] **Step 4: Log admin_reset**

Replace the `reset` action body similarly:

Old:
```ts
  reset: async ({ params, locals }) => {
    if (!isAdmin(locals.user)) throw error(403, 'Admin access required');
    await db.delete(bingoProgress).where(eq(bingoProgress.userId, params.id));
    await db
      .update(user)
      .set({
        bingoVerifiedAt: null,
        bingoVerifiedBy: null,
        cardSeed: randomUUID(),
        updatedAt: new Date()
      })
      .where(eq(user.id, params.id));
    return { ok: true, reset: true };
  }
```

New:
```ts
  reset: async ({ params, locals }) => {
    if (!isAdmin(locals.user) || !locals.user) throw error(403, 'Admin access required');
    const [target] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, params.id))
      .limit(1);
    await db.delete(bingoProgress).where(eq(bingoProgress.userId, params.id));
    await db
      .update(user)
      .set({
        bingoVerifiedAt: null,
        bingoVerifiedBy: null,
        cardSeed: randomUUID(),
        updatedAt: new Date()
      })
      .where(eq(user.id, params.id));
    await logActivity({ userId: locals.user.id, type: 'admin_reset', detail: target?.name ?? null });
    return { ok: true, reset: true };
  }
```

- [ ] **Step 5: Type-check**

Run: `bun run check`
Expected: no errors in `admin/users/[id]/+page.server.ts`.

- [ ] **Step 6: Checkpoint** — `check` clean.

---

## Task 8: Log admin tile actions

**Files:**
- Modify: `src/routes/admin/tiles/+page.server.ts`

- [ ] **Step 1: Import logActivity**

At the top, add:

```ts
import { logActivity } from '$lib/server/activity';
```

- [ ] **Step 2: Log tile_update**

In the `update` action, after the `db.update(bingoTile)...` call and before `return { ok: true };`:

```ts
    await logActivity({ userId: locals.user.id, type: 'tile_update', detail: label });
```

(`locals.user` is non-null after the `isAdmin` guard; if `bun run check` complains, change the guard to `if (!isAdmin(locals.user) || !locals.user)`.)

- [ ] **Step 3: Log tile_create**

In the `create` action, after the `db.insert(bingoTile)...` call and before `return { ok: true };`:

```ts
    await logActivity({ userId: locals.user.id, type: 'tile_create', detail: label });
```

- [ ] **Step 4: Log tile_delete**

The `delete` action only has the id. Fetch the label before deleting, then log. Replace the body:

Old:
```ts
  delete: async ({ request, locals }) => {
    if (!isAdmin(locals.user)) throw error(403, 'Admin access required');
    const form = await request.formData();
    const id = parseTileId(form);
    if (!id) return fail(400, { message: 'id required' });
    await db.delete(bingoTile).where(eq(bingoTile.id, id));
    return { ok: true };
  },
```

New:
```ts
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
```

- [ ] **Step 5: Log tile_bulk_add**

In the `bulkAdd` action, after the transaction that inserts the labels and before `return { ok: true, form: 'bulkAdd', added: labels.length };`:

```ts
    await logActivity({
      userId: locals.user.id,
      type: 'tile_bulk_add',
      detail: `${labels.length} tiles`
    });
```

If `locals.user` is flagged possibly-null here, also update that action's guard to `if (!isAdmin(locals.user) || !locals.user)`.

- [ ] **Step 6: Type-check**

Run: `bun run check`
Expected: no errors in `admin/tiles/+page.server.ts`.

- [ ] **Step 7: Checkpoint** — `check` clean.

---

## Task 9: Feed load with filters, limit, live dependency, and purge

**Files:**
- Modify: `src/routes/admin/activity/+page.server.ts`

- [ ] **Step 1: Replace the file with the filtered load + purge action**

Replace the entire contents of `src/routes/admin/activity/+page.server.ts` with:

```ts
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
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: no errors. (If `selectDistinct` is flagged, confirm drizzle-orm 0.38 exposes it — it does; the chain mirrors `.select`.)

- [ ] **Step 3: Checkpoint** — `check` clean.

---

## Task 10: Export endpoint

**Files:**
- Create: `src/routes/admin/activity/export/+server.ts`

- [ ] **Step 1: Create the endpoint**

Create `src/routes/admin/activity/export/+server.ts`:

```ts
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
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: no errors.

- [ ] **Step 3: Checkpoint** — `check` clean.

---

## Task 11: Feed UI (filters, live poll, export, purge, new labels)

**Files:**
- Modify: `src/routes/admin/activity/+page.svelte`

- [ ] **Step 1: Replace the page with the controls-enabled version**

Replace the entire contents of `src/routes/admin/activity/+page.svelte` with:

```svelte
<!-- src/routes/admin/activity/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { livePoll } from '$lib/livePoll.svelte';
  import { eventLabel, badgeClass, TYPE_GROUPS, TYPE_LABEL } from '$lib/activityMeta';
  import { LIMIT_STEP } from '$lib/server/activityQuery';
  import SlideToConfirm from '$lib/SlideToConfirm.svelte';

  let { data } = $props();

  livePoll('app:activity');

  let purgeMode = $state<'all' | 'older'>('older');
  let purgeBefore = $state('');

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

  // Build a query string from the current filters with overrides applied.
  function queryWith(overrides: Record<string, string | null>): string {
    const params = new URLSearchParams();
    const type = overrides.type !== undefined ? overrides.type : data.filters.type;
    const user = overrides.user !== undefined ? overrides.user : data.filters.userId;
    const limit = overrides.limit !== undefined ? overrides.limit : String(data.filters.limit);
    if (type) params.set('type', type);
    if (user) params.set('user', user);
    if (limit) params.set('limit', limit);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  function onTypeChange(e: Event) {
    const value = (e.currentTarget as HTMLSelectElement).value;
    goto(queryWith({ type: value || null, limit: null }), { keepFocus: true, noScroll: true });
  }

  function onUserChange(e: Event) {
    const value = (e.currentTarget as HTMLSelectElement).value;
    goto(queryWith({ user: value || null, limit: null }), { keepFocus: true, noScroll: true });
  }

  function loadMore() {
    goto(queryWith({ limit: String(data.filters.limit + LIMIT_STEP) }), {
      keepFocus: true,
      noScroll: true
    });
  }

  const exportHref = $derived((format: 'csv' | 'json') => `/admin/activity/export${queryWith({ limit: null })}${queryWith({ limit: null }) ? '&' : '?'}format=${format}`);
</script>

<header class="space-y-1 text-center">
  <h1 class="text-3xl font-extrabold tracking-tight">Activity</h1>
  <p class="text-sm text-slate-300">
    Showing {data.events.length}{data.hasMore ? '+' : ''} events
  </p>
</header>

<!-- Controls -->
<div class="flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
  <label class="flex flex-col gap-1 text-xs text-slate-300">
    Type
    <select
      class="rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-sm text-slate-100"
      value={data.filters.type ?? ''}
      onchange={onTypeChange}
    >
      <option value="">All types</option>
      {#each TYPE_GROUPS as group (group.label)}
        <optgroup label={group.label}>
          {#each group.types as t (t)}
            <option value={t}>{TYPE_LABEL[t]}</option>
          {/each}
        </optgroup>
      {/each}
    </select>
  </label>

  <label class="flex flex-col gap-1 text-xs text-slate-300">
    User
    <select
      class="rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-sm text-slate-100"
      value={data.filters.userId ?? ''}
      onchange={onUserChange}
    >
      <option value="">All users</option>
      {#each data.users as u (u.id)}
        <option value={u.id}>{u.name}</option>
      {/each}
    </select>
  </label>

  <div class="ml-auto flex items-end gap-2">
    <a
      href={exportHref('csv')}
      class="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-100 hover:bg-white/10"
    >
      Export CSV
    </a>
    <a
      href={exportHref('json')}
      class="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-100 hover:bg-white/10"
    >
      Export JSON
    </a>
  </div>
</div>

<!-- Purge -->
<details class="rounded-lg border border-rose-400/30 bg-rose-950/20 px-4 py-3">
  <summary class="cursor-pointer text-sm font-semibold text-rose-200">Purge activity log</summary>
  <form
    method="POST"
    action="?/purge"
    class="mt-3 space-y-3"
    onsubmit={(e) => {
      // SlideToConfirm triggers submit; nothing to prevent here.
    }}
  >
    <div class="flex flex-wrap items-center gap-3 text-sm text-slate-200">
      <label class="flex items-center gap-2">
        <input type="radio" name="mode" value="older" bind:group={purgeMode} />
        Older than
      </label>
      <input
        type="date"
        name="before"
        bind:value={purgeBefore}
        disabled={purgeMode !== 'older'}
        class="rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-slate-100 disabled:opacity-40"
      />
      <label class="flex items-center gap-2">
        <input type="radio" name="mode" value="all" bind:group={purgeMode} />
        Everything
      </label>
    </div>
    <SlideToConfirm
      variant="danger"
      label="Slide to purge"
      confirmedLabel="Purging..."
      disabled={purgeMode === 'older' && !purgeBefore}
      onconfirm={(e) => {
        (document.querySelector('form[action="?/purge"]') as HTMLFormElement)?.requestSubmit();
      }}
    />
  </form>
</details>

{#if data.events.length === 0}
  <p class="rounded-lg border border-white/10 bg-white/5 px-4 py-8 text-center text-slate-300">
    No activity matches these filters.
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
            {eventLabel(e.type, e.detail)}
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
                {eventLabel(e.type, e.detail)}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if data.hasMore}
    <div class="text-center">
      <button
        type="button"
        onclick={loadMore}
        class="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
      >
        Load more
      </button>
    </div>
  {/if}
{/if}
```

Notes for the implementer:
- `livePoll` is imported from `$lib/livePoll.svelte` (the runes module; the file is `livePoll.svelte.ts`, imported without the `.ts`).
- `LIMIT_STEP` is imported from `$lib/server/activityQuery`. This is a server module, but only the `LIMIT_STEP` numeric constant is referenced; it pulls no server-only runtime in. If `svelte-check` or the bundler objects to importing from a `server` path in a component, move `DEFAULT_LIMIT`/`LIMIT_STEP` constants into `$lib/activityMeta.ts` and import them there instead, updating `activityQuery.ts` to re-import them.
- The `exportHref` derived builds `/admin/activity/export?...&format=csv`. Confirm the resulting URL has exactly one `?` and `format` appended correctly during manual testing; simplify the helper if the double-`queryWith` call reads awkwardly.

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: no errors. Resolve any `$lib/server` import objection per the note above if it appears.

- [ ] **Step 3: Checkpoint** — `check` clean.

---

## Task 12: Full verification

- [ ] **Step 1: Run all unit tests**

Run: `bun run test`
Expected: all tests in `activityMeta`, `bingo`, `activityQuery`, `activityExport` pass.

- [ ] **Step 2: Type-check the whole project**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 3: Manual smoke test (requires a running DB + dev server)**

Run: `bun run dev`, sign in as an admin, then verify:
- Mark a tile to bingo: feed shows `tile_complete` rows and a single `bingo_win` with the winning line; marking more tiles does not add more `bingo_win` rows.
- Un-mark a tile: a `tile_uncomplete` row appears.
- Reset your card: a `card_reshuffle` row appears.
- As admin, verify/un-verify/reset a player and create/edit/delete/bulk-add tiles: matching `admin_*` / `tile_*` rows appear with the target name/label in the event text.
- On `/admin/activity`: filter by type and by user (URL updates, list narrows); "Load more" grows the list; leaving the tab and returning refreshes (live poll).
- Click Export CSV and Export JSON: files download, honoring the active filters.
- Purge "older than" a date and purge "everything" (behind the slide-to-confirm): rows are removed.

- [ ] **Step 4: Final checkpoint** — report results to the user and leave committing to them.

---

## Self-Review Notes

- **Spec coverage:** New event types (Task 6-8) cover tile_uncomplete, bingo_win, card_reshuffle, admin verify/unverify/reset, tile create/update/delete/bulk_add. Admin feed filter-by-type/user, pagination (growing limit), live updates (Task 9 + 11). Export CSV/JSON (Task 5 + 10 + 11). Manual purge all/older-than (Task 4 + 9 + 11). Auto-pruning intentionally excluded per spec. Target-in-detail (no schema change) honored. All spec sections map to tasks.
- **Open points from spec:** `bingo_win` line description implemented via `describeWinLine` with a `null`/"Bingo!" fallback in `eventLabel`. Purge action is not itself logged (matches spec default).
- **Type consistency:** `ActivityType` is defined once in `activityMeta.ts` and re-exported by `activity.ts`; `bingoWinTransition`/`describeWinLine`, `buildActivityFilters`/`parsePurgeRequest`, `toCsv`/`toJson`, and `ExportRow` names are used identically across tasks and tests.

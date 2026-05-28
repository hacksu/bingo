# Select Column Minimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten every Drizzle SELECT query to fetch only the columns the caller actually uses, eliminating silent leakage of sensitive fields (OAuth tokens, email, cardSeed, etc.) into server logic or frontend payloads.

**Architecture:** Use Drizzle's `db.select({ col: table.col, ... })` inline on each query — no new files, no shared column objects. TypeScript narrows return types automatically so accessing a dropped field is a compile error. Two Svelte templates that rendered `email` are also updated to remove that column from the UI.

**Tech Stack:** SvelteKit 2, Drizzle ORM (`drizzle-orm/postgres-js`), TypeScript, Bun

---

### Task 1: Tighten queries in `src/lib/server/admin.ts`

**Files:**
- Modify: `src/lib/server/admin.ts`

This file has the two most sensitive queries: a full `user` select (only `id` and `role` are used) and a full `account` select that fetches `accessToken`, `refreshToken`, `idToken`, and `password` when only `accessToken` is needed.

- [ ] **Step 1: Replace both full selects with column-scoped selects**

Replace the current `admin.ts` content with:

```ts
import { and, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { account, user } from './db/schema';

const DISCORD_API = 'https://discord.com/api/v10';

export async function refreshDiscordRole(userId: string): Promise<'admin' | 'user'> {
  const guildId = env.DISCORD_GUILD_ID;
  const adminRoleId = env.DISCORD_ADMIN_ROLE_ID;

  const [current] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!current) return 'user';
  const currentRole: 'admin' | 'user' = current.role === 'admin' ? 'admin' : 'user';

  if (!guildId || !adminRoleId) return currentRole;

  const [discordAccount] = await db
    .select({ accessToken: account.accessToken })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'discord')))
    .limit(1);

  if (!discordAccount?.accessToken) return currentRole;

  let res: Response;
  try {
    res = await fetch(`${DISCORD_API}/users/@me/guilds/${guildId}/member`, {
      headers: { Authorization: `Bearer ${discordAccount.accessToken}` }
    });
  } catch {
    return currentRole;
  }

  if (res.status === 401 || res.status === 403) return currentRole;

  let nextRole: 'admin' | 'user';
  if (res.status === 404) {
    nextRole = 'user';
  } else if (res.ok) {
    const member = (await res.json().catch(() => null)) as { roles?: string[] } | null;
    nextRole = member?.roles?.includes(adminRoleId) ? 'admin' : 'user';
  } else {
    return currentRole;
  }

  if (currentRole !== nextRole) {
    await db.update(user).set({ role: nextRole, updatedAt: new Date() }).where(eq(user.id, userId));
  }
  return nextRole;
}

export function isAdmin(u: { role?: string | null } | null | undefined): boolean {
  return u?.role === 'admin';
}
```

- [ ] **Step 2: Run type check**

```bash
bun run check
```

Expected: no errors in `src/lib/server/admin.ts`.

---

### Task 2: Tighten queries in `src/routes/admin/+page.server.ts`

**Files:**
- Modify: `src/routes/admin/+page.server.ts`

Three full selects: `bingoTile` (needs `id, position, isFreeSpace, isActive` — no `label`, tiles aren't returned to frontend here), `bingoProgress` (needs `userId, tileId`), `user` (needs `id, name, image, role, cardSeed, bingoVerifiedAt` — drop `email`). The mapped row object returned to the frontend must also drop `email`.

- [ ] **Step 1: Replace the load function with column-scoped selects and remove email from the return**

Replace the full content of `src/routes/admin/+page.server.ts` with:

```ts
import { db } from '$lib/server/db';
import { bingoProgress, bingoTile, user } from '$lib/server/db/schema';
import { detectBingo } from '$lib/bingo';
import { shuffleTilesForUser } from '$lib/server/cardShuffle';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const tiles = await db
    .select({ id: bingoTile.id, position: bingoTile.position, isFreeSpace: bingoTile.isFreeSpace, isActive: bingoTile.isActive })
    .from(bingoTile);

  const allProgress = await db
    .select({ userId: bingoProgress.userId, tileId: bingoProgress.tileId })
    .from(bingoProgress);

  const users = await db
    .select({ id: user.id, name: user.name, image: user.image, role: user.role, cardSeed: user.cardSeed, bingoVerifiedAt: user.bingoVerifiedAt })
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

  const rows = users.map((u) => {
    const completedIds = completedByUser.get(u.id) ?? new Set<string>();
    const ordered = shuffleTilesForUser(tiles, u.cardSeed);
    const positions = new Set<number>();
    ordered.forEach((t, idx) => {
      if (completedIds.has(t.id) || t.isFreeSpace) positions.add(idx);
    });
    const { hasBingo } = detectBingo(positions);
    const verified = !!u.bingoVerifiedAt;
    return {
      id: u.id,
      name: u.name,
      image: u.image,
      role: u.role,
      completed: completedIds.size,
      hasBingo,
      verified,
      verifiedAt: u.bingoVerifiedAt,
      sortRank: hasBingo && !verified ? 2 : hasBingo && verified ? 1 : 0
    };
  });

  rows.sort(
    (a, b) =>
      b.sortRank - a.sortRank ||
      b.completed - a.completed ||
      a.name.localeCompare(b.name)
  );

  return {
    users: rows,
    tileCount: tiles.length,
    lockedCount: tiles.filter((t) => !t.isActive).length,
    pendingCount: rows.filter((r) => r.hasBingo && !r.verified).length,
    verifiedCount: rows.filter((r) => r.verified).length
  };
};
```

- [ ] **Step 2: Run type check**

```bash
bun run check
```

Expected: no errors in `src/routes/admin/+page.server.ts`. The Svelte template still references `u.email` — that will produce a type error here, which Task 6 resolves.

---

### Task 3: Tighten queries in `src/routes/bingo/+page.server.ts`

**Files:**
- Modify: `src/routes/bingo/+page.server.ts`

Four queries to tighten: tiles load (needs `id, label, position, isFreeSpace, isActive` — label IS needed since tiles are spread to the frontend), user progress (needs `tileId` only), tile toggle existence check (needs `isActive, isFreeSpace`), progress existence check (needs `id` only for the length check).

- [ ] **Step 1: Replace the four full selects with column-scoped selects**

Replace the full content of `src/routes/bingo/+page.server.ts` with:

```ts
import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db';
import { bingoProgress, bingoTile, user } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import { detectBingo } from '$lib/bingo';
import { shuffleTilesForUser } from '$lib/server/cardShuffle';
import type { Actions, PageServerLoad } from './$types';

async function resetUserBoard(userId: string, regenerateSeed: boolean): Promise<void> {
  await db.delete(bingoProgress).where(eq(bingoProgress.userId, userId));
  await db
    .update(user)
    .set({
      bingoVerifiedAt: null,
      bingoVerifiedBy: null,
      ...(regenerateSeed ? { cardSeed: randomUUID() } : {}),
      updatedAt: new Date()
    })
    .where(eq(user.id, userId));
}

async function ensureCardSeed(userId: string, existing: string | null): Promise<string> {
  if (existing) return existing;
  const seed = randomUUID();
  await db.update(user).set({ cardSeed: seed, updatedAt: new Date() }).where(eq(user.id, userId));
  return seed;
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, '/login');

  const tiles = await db
    .select({ id: bingoTile.id, label: bingoTile.label, position: bingoTile.position, isFreeSpace: bingoTile.isFreeSpace, isActive: bingoTile.isActive })
    .from(bingoTile)
    .orderBy(bingoTile.position);

  const progress = await db
    .select({ tileId: bingoProgress.tileId })
    .from(bingoProgress)
    .where(eq(bingoProgress.userId, locals.user.id));

  const [me] = await db
    .select({
      bingoVerifiedAt: user.bingoVerifiedAt,
      bingoVerifiedBy: sql<string | null>`(SELECT name FROM "user" WHERE id = ${user.bingoVerifiedBy})`,
      cardSeed: user.cardSeed
    })
    .from(user)
    .where(eq(user.id, locals.user.id))
    .limit(1);

  const seed = await ensureCardSeed(locals.user.id, me?.cardSeed ?? null);
  const ordered = shuffleTilesForUser(tiles, seed);

  const completed = new Set(progress.map((p) => p.tileId));

  const completedPositions = new Set<number>();
  ordered.forEach((t, idx) => {
    if (completed.has(t.id) || t.isFreeSpace) completedPositions.add(idx);
  });
  const { hasBingo, winningPositions } = detectBingo(completedPositions);

  return {
    tiles: ordered.map((t, idx) => ({
      ...t,
      completed: completed.has(t.id) || t.isFreeSpace,
      winning: winningPositions.has(idx)
    })),
    hasBingo,
    verifiedAt: me?.bingoVerifiedAt ?? null,
    verifiedBy: me?.bingoVerifiedBy ?? null
  };
};

export const actions: Actions = {
  toggle: async ({ request, locals }) => {
    if (!locals.user) throw error(401, 'Unauthorized');

    const form = await request.formData();
    const tileId = form.get('tileId');
    if (typeof tileId !== 'string' || !tileId) return fail(400, { message: 'tileId required' });

    const [tile] = await db
      .select({ isActive: bingoTile.isActive, isFreeSpace: bingoTile.isFreeSpace })
      .from(bingoTile)
      .where(eq(bingoTile.id, tileId))
      .limit(1);
    if (!tile) return fail(404, { message: 'tile not found' });
    if (!tile.isActive) return fail(403, { message: 'tile is locked' });
    if (tile.isFreeSpace) return { ok: true };

    const existing = await db
      .select({ id: bingoProgress.id })
      .from(bingoProgress)
      .where(and(eq(bingoProgress.userId, locals.user.id), eq(bingoProgress.tileId, tileId)))
      .limit(1);

    if (existing.length) {
      await db
        .delete(bingoProgress)
        .where(and(eq(bingoProgress.userId, locals.user.id), eq(bingoProgress.tileId, tileId)));
      return { ok: true, completed: false };
    }

    await db.insert(bingoProgress).values({
      id: randomUUID(),
      userId: locals.user.id,
      tileId
    });

    return { ok: true, completed: true };
  },

  reset: async ({ locals }) => {
    if (!locals.user) throw error(401, 'Unauthorized');
    await resetUserBoard(locals.user.id, true);
    return { ok: true, reset: true };
  }
};
```

- [ ] **Step 2: Run type check**

```bash
bun run check
```

Expected: no errors in `src/routes/bingo/+page.server.ts`.

---

### Task 4: Tighten queries in `src/routes/admin/tiles/+page.server.ts`

**Files:**
- Modify: `src/routes/admin/tiles/+page.server.ts`

Two queries to tighten: tiles load (needs `id, label, position, isFreeSpace, isActive` — all sent to frontend) and the bulkAdd count query (needs `id, position` — `id` for `.length`, `position` for the `reduce` max).

- [ ] **Step 1: Replace the two full selects with column-scoped selects**

Replace the full content of `src/routes/admin/tiles/+page.server.ts` with:

```ts
import { error, fail } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db';
import { bingoTile } from '$lib/server/db/schema';
import { GRID_SIZE } from '$lib/bingo';
import { isAdmin } from '$lib/server/admin';
import type { Actions, PageServerLoad } from './$types';

const TARGET_TILES = GRID_SIZE * GRID_SIZE;

export const load: PageServerLoad = async () => {
  const tiles = await db
    .select({ id: bingoTile.id, label: bingoTile.label, position: bingoTile.position, isFreeSpace: bingoTile.isFreeSpace, isActive: bingoTile.isActive })
    .from(bingoTile)
    .orderBy(bingoTile.position);
  return {
    tiles,
    target: TARGET_TILES,
    gridSize: GRID_SIZE
  };
};

function parseTileId(form: FormData) {
  const id = form.get('id');
  return typeof id === 'string' && id ? id : null;
}

function parseLabels(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(',')[0].trim().replace(/^"(.*)"$/, '$1').trim())
    .filter((s) => s.length > 0);
}

export const actions: Actions = {
  update: async ({ request, locals }) => {
    if (!isAdmin(locals.user)) throw error(403, 'Admin access required');
    const form = await request.formData();
    const id = parseTileId(form);
    if (!id) return fail(400, { message: 'id required' });

    const label = String(form.get('label') ?? '').trim();
    const positionRaw = form.get('position');
    const position = positionRaw === null ? NaN : Number(positionRaw);
    const isActive = form.get('isActive') === 'on';
    const isFreeSpace = form.get('isFreeSpace') === 'on';

    if (!label) return fail(400, { message: 'label required' });
    if (!Number.isInteger(position) || position < 0) {
      return fail(400, { message: 'position must be a non-negative integer' });
    }

    await db
      .update(bingoTile)
      .set({ label, position, isActive, isFreeSpace })
      .where(eq(bingoTile.id, id));
    return { ok: true };
  },

  create: async ({ request, locals }) => {
    if (!isAdmin(locals.user)) throw error(403, 'Admin access required');
    const form = await request.formData();
    const label = String(form.get('label') ?? '').trim();
    if (!label) return fail(400, { message: 'label required' });

    const [{ max = -1 } = { max: -1 }] = await db
      .select({ max: sql<number>`coalesce(max(${bingoTile.position}), -1)::int` })
      .from(bingoTile);

    await db.insert(bingoTile).values({
      id: randomUUID(),
      label,
      position: max + 1,
      isActive: true,
      isFreeSpace: false
    });
    return { ok: true };
  },

  delete: async ({ request, locals }) => {
    if (!isAdmin(locals.user)) throw error(403, 'Admin access required');
    const form = await request.formData();
    const id = parseTileId(form);
    if (!id) return fail(400, { message: 'id required' });
    await db.delete(bingoTile).where(eq(bingoTile.id, id));
    return { ok: true };
  },

  bulkAdd: async ({ request, locals }) => {
    if (!isAdmin(locals.user)) throw error(403, 'Admin access required');
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return fail(400, { form: 'bulkAdd', message: 'Choose a CSV file to upload.' });
    }

    const text = await file.text();
    const labels = parseLabels(text);
    if (labels.length === 0) {
      return fail(400, { form: 'bulkAdd', message: 'No labels found in file.' });
    }

    const existing = await db
      .select({ id: bingoTile.id, position: bingoTile.position })
      .from(bingoTile);
    const total = existing.length + labels.length;

    if (total < TARGET_TILES) {
      const short = TARGET_TILES - total;
      return fail(400, {
        form: 'bulkAdd',
        message: `Upload would result in ${total} tiles, short of the ${TARGET_TILES} (${GRID_SIZE}×${GRID_SIZE}) needed for a complete card. Add ${short} more row${short === 1 ? '' : 's'} to your CSV.`,
        existing: existing.length,
        incoming: labels.length,
        target: TARGET_TILES
      });
    }

    const maxPos = existing.reduce((m, t) => Math.max(m, t.position), -1);

    await db.transaction(async (tx) => {
      await tx.insert(bingoTile).values(
        labels.map((label, i) => ({
          id: randomUUID(),
          label,
          position: maxPos + 1 + i,
          isActive: true,
          isFreeSpace: false
        }))
      );
    });

    return { ok: true, form: 'bulkAdd', added: labels.length };
  }
};
```

- [ ] **Step 2: Run type check**

```bash
bun run check
```

Expected: no errors in `src/routes/admin/tiles/+page.server.ts`.

---

### Task 5: Tighten queries in `src/routes/admin/users/[id]/+page.server.ts`

**Files:**
- Modify: `src/routes/admin/users/[id]/+page.server.ts`

Four queries to tighten: `loadBingoState` tiles (needs `id, label, position, isFreeSpace, isActive`), `loadBingoState` progress (needs `tileId`), page load user (needs `id, name, image, cardSeed, bingoVerifiedAt, bingoVerifiedBy` — drop `email`), verify action user (needs `id, cardSeed`). The returned `target` object must also drop `email`.

- [ ] **Step 1: Replace the full selects with column-scoped selects and remove email from the target return**

Replace the full content of `src/routes/admin/users/[id]/+page.server.ts` with:

```ts
import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db';
import { bingoProgress, bingoTile, user } from '$lib/server/db/schema';
import { detectBingo } from '$lib/bingo';
import { shuffleTilesForUser } from '$lib/server/cardShuffle';
import { isAdmin } from '$lib/server/admin';
import type { Actions, PageServerLoad } from './$types';

async function loadBingoState(targetId: string, seed: string | null) {
  const tiles = await db
    .select({ id: bingoTile.id, label: bingoTile.label, position: bingoTile.position, isFreeSpace: bingoTile.isFreeSpace, isActive: bingoTile.isActive })
    .from(bingoTile)
    .orderBy(bingoTile.position);
  const progress = await db
    .select({ tileId: bingoProgress.tileId })
    .from(bingoProgress)
    .where(eq(bingoProgress.userId, targetId));
  const completed = new Set(progress.map((p) => p.tileId));

  const ordered = shuffleTilesForUser(tiles, seed);

  const completedPositions = new Set<number>();
  ordered.forEach((t, idx) => {
    if (!t.isActive) return;
    if (completed.has(t.id) || t.isFreeSpace) completedPositions.add(idx);
  });
  const { hasBingo, winningPositions } = detectBingo(completedPositions);
  return { tiles: ordered, completed, hasBingo, winningPositions };
}

export const load: PageServerLoad = async ({ params }) => {
  const [target] = await db
    .select({ id: user.id, name: user.name, image: user.image, cardSeed: user.cardSeed, bingoVerifiedAt: user.bingoVerifiedAt, bingoVerifiedBy: user.bingoVerifiedBy })
    .from(user)
    .where(eq(user.id, params.id))
    .limit(1);
  if (!target) throw error(404, 'User not found');

  const { tiles, completed, hasBingo, winningPositions } = await loadBingoState(
    target.id,
    target.cardSeed
  );

  return {
    target: {
      id: target.id,
      name: target.name,
      image: target.image,
      bingoVerifiedAt: target.bingoVerifiedAt,
      bingoVerifiedBy: target.bingoVerifiedBy
    },
    tiles: tiles.map((t, idx) => ({
      ...t,
      completed: completed.has(t.id) || t.isFreeSpace,
      selfMarked: completed.has(t.id),
      winning: winningPositions.has(idx)
    })),
    hasBingo
  };
};

export const actions: Actions = {
  verify: async ({ params, locals }) => {
    if (!isAdmin(locals.user)) throw error(403, 'Admin access required');

    const [target] = await db
      .select({ id: user.id, cardSeed: user.cardSeed })
      .from(user)
      .where(eq(user.id, params.id))
      .limit(1);
    if (!target) return fail(404, { message: 'User not found' });

    const { hasBingo } = await loadBingoState(target.id, target.cardSeed);
    if (!hasBingo) {
      return fail(400, { message: 'Player no longer has a bingo — refresh and re-check.' });
    }

    await db
      .update(user)
      .set({
        bingoVerifiedAt: new Date(),
        bingoVerifiedBy: locals.user.id,
        updatedAt: new Date()
      })
      .where(eq(user.id, target.id));
    return { ok: true, verified: true };
  },

  unverify: async ({ params, locals }) => {
    if (!isAdmin(locals.user)) throw error(403, 'Admin access required');
    await db
      .update(user)
      .set({ bingoVerifiedAt: null, bingoVerifiedBy: null, updatedAt: new Date() })
      .where(eq(user.id, params.id));
    return { ok: true, verified: false };
  },

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
};
```

- [ ] **Step 2: Run type check**

```bash
bun run check
```

Expected: type error in `src/routes/admin/users/[id]/+page.svelte` at `data.target.email` — that's resolved in Task 6.

---

### Task 6: Remove email from Svelte templates

**Files:**
- Modify: `src/routes/admin/+page.svelte`
- Modify: `src/routes/admin/users/[id]/+page.svelte`

Email is rendered in two places. Remove the column and its header from the admin user table, and remove the email subtitle from the user detail page.

- [ ] **Step 1: Remove the Email column from `src/routes/admin/+page.svelte`**

Remove the `<th>` header and the `<td>` cell for email. The table currently has headers: Status, Player, Email, Role, Progress, (actions). After this change it will be: Status, Player, Role, Progress, (actions).

In `src/routes/admin/+page.svelte`, remove line 38:
```html
        <th class="px-4 py-2">Email</th>
```

And remove line 69:
```html
          <td class="px-4 py-2 text-slate-300">{u.email}</td>
```

- [ ] **Step 2: Remove the email paragraph from `src/routes/admin/users/[id]/+page.svelte`**

Remove line 27:
```html
    <p class="text-sm text-slate-300">{data.target.email}</p>
```

- [ ] **Step 3: Run type check**

```bash
bun run check
```

Expected: 0 errors, 0 warnings.

---

### Task 7: Final verification

- [ ] **Step 1: Run full type check and confirm clean**

```bash
bun run check
```

Expected output: `svelte-check found 0 errors and 0 warnings` (or equivalent zero-error output).

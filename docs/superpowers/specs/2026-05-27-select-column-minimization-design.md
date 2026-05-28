# Select Column Minimization

**Date:** 2026-05-27
**Status:** Approved

## Goal

Tighten every Drizzle SELECT query to fetch only the columns the caller actually uses. Prevents sensitive fields (OAuth tokens, email, cardSeed, etc.) from silently propagating into server logic or frontend payloads.

## Approach

Use Drizzle's `db.select({ col: table.col, ... })` inline on each query. No shared column objects, no new files — just explicit projections at the call site. TypeScript narrows the return type automatically, so accessing a dropped field becomes a compile error.

`shuffleTilesForUser` is generic (`T extends { id, position, isFreeSpace }`) so narrowed tile types are compatible without any signature changes.

## Query Changes

### `src/lib/server/admin.ts`

| Query | Keep | Drop |
|---|---|---|
| user role check | `id, role` | all other fields |
| account token check | `accessToken` | `refreshToken, idToken, password, scope, createdAt, updatedAt, ...` |

### `src/routes/admin/+page.server.ts`

| Query | Keep | Drop |
|---|---|---|
| bingoTile | `id, position, isFreeSpace, isActive` | `label, createdAt` |
| bingoProgress | `userId, tileId` | `id, completedAt` |
| user | `id, name, image, role, cardSeed, bingoVerifiedAt` | `email, emailVerified, bingoVerifiedBy, createdAt, updatedAt` |

The mapped row object returned to the frontend must also have `email` removed.

### `src/routes/bingo/+page.server.ts`

| Query | Keep | Drop |
|---|---|---|
| bingoTile (load) | `id, label, position, isFreeSpace, isActive` | `createdAt` |
| bingoProgress (load) | `tileId` | `id, userId, completedAt` |
| bingoTile (toggle action) | `isActive, isFreeSpace` | all other fields |
| bingoProgress (existence check) | `id` | `userId, tileId, completedAt` |

The `me` user query is already explicitly constrained — no change.

### `src/routes/admin/tiles/+page.server.ts`

| Query | Keep | Drop |
|---|---|---|
| bingoTile (load) | `id, label, position, isFreeSpace, isActive` | `createdAt` |
| bingoTile (bulkAdd count) | `id, position` | `label, isFreeSpace, isActive, createdAt` |

The `max(position)` aggregation query is already constrained — no change.

### `src/routes/admin/users/[id]/+page.server.ts`

| Query | Keep | Drop |
|---|---|---|
| bingoTile (loadBingoState) | `id, label, position, isFreeSpace, isActive` | `createdAt` |
| bingoProgress (loadBingoState) | `tileId` | `id, userId, completedAt` |
| user (load) | `id, name, image, cardSeed, bingoVerifiedAt, bingoVerifiedBy` | `email, role, emailVerified, createdAt, updatedAt` |
| user (verify action) | `id, cardSeed` | all other fields |

## Out of Scope

- No changes to Better Auth-managed tables (session, verification) — those are queried internally by the auth library, not application code.
- No shared column projection objects — premature abstraction for this codebase size.
- No changes to INSERT or UPDATE queries.

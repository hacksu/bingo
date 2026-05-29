# Mobile Support Design

**Date:** 2026-05-28
**Status:** Approved

## Problem

The app is not usable on mobile. The 5x5 circle grid clips text out of tile bounds on small screens, the header nav crowds into one row, and the admin tables overflow horizontally with no alternative layout.

## Approach

Use Tailwind breakpoint classes and `sm:hidden` / `hidden sm:block` alternate layouts throughout. No new components created. Desktop layouts are completely unchanged.

Breakpoint: `sm` (640px) is the mobile/desktop boundary for all changes.

---

## Changes by File

### `src/routes/+layout.svelte`

Split the header into two rows below `sm`, single row at `sm` and above.

**Mobile (below sm):**
- Row 1: Logo left, Admin link right (conditional on admin role)
- Row 2 (logged in): "My Card" and "Sign out" as full-width flex children
- Row 2 (logged out): "Sign in" button full-width

**Desktop (sm+):** Unchanged — logo left, Admin + My Card + Sign out in one right-side row.

---

### `src/routes/bingo/+page.svelte`

Bingo grid tiles: circles on desktop, rounded squares on mobile.

- `rounded-full` → `rounded-lg sm:rounded-full`
- `gap-3 sm:gap-4` → `gap-2 sm:gap-3`
- `p-2` → `p-1.5 sm:p-2`

---

### `src/routes/+page.svelte` (Landing)

- Logo: `h-60` → `h-36 sm:h-60`
- Title: `text-5xl` → `text-3xl sm:text-5xl`
- Side robots: keep `hidden md:block` (unchanged)
- Add a `md:hidden` row below the CTA button showing both robots at `size-24` (96px), tilted as on desktop (green -8deg left, blue 8deg right)

---

### `src/routes/admin/+page.svelte` (Users table)

Add a `sm:hidden` card stack above the existing table. Apply `hidden sm:block` to the table wrapper.

Each card contains:
- User name (bold) + role + progress (e.g. "member · 14 / 25")
- Status badge (BINGO or VERIFIED) if applicable
- Full-width Verify or View link button, styled to match current table button states

---

### `src/routes/admin/tiles/+page.svelte` (Tiles table)

Add a `sm:hidden` card stack above the existing table. Apply `hidden sm:block` to the table wrapper.

Each tile card contains:
- Label input (full width), referencing the existing hidden form via `form="upd-{tile.id}"`
- Inline row: Pos number input + Active checkbox + Free checkbox
- Full-width Save and Delete buttons side by side

The existing hidden forms div is unchanged — card inputs use `form=` attributes to wire up correctly.

---

### `src/routes/admin/users/[id]/+page.svelte` (User detail grid)

Same tile change as `/bingo`:
- `rounded-full` → `rounded-lg sm:rounded-full`
- `gap-3 sm:gap-4` → `gap-2 sm:gap-3`
- `p-2` → `p-1.5 sm:p-2`

---

### `src/routes/login/+page.svelte`

No changes. Already `max-w-md mx-auto`, works fine on mobile.

---

## Out of Scope

- No new Svelte components
- No JS-based hamburger menu or drawers
- No changes to desktop layouts
- Admin layout (`src/routes/admin/+layout.svelte`) has no nav of its own, no changes needed

# Mobile Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the full app usable on mobile by switching the bingo grid to rounded squares, adding a two-row mobile header, and replacing admin tables with card stacks at small screen widths.

**Architecture:** Pure Tailwind breakpoint classes and `sm:hidden` / `hidden sm:block` alternate layouts. No new components, no JS. Desktop layouts are completely unchanged. The `sm` breakpoint (640px) is the mobile/desktop boundary throughout, except the landing page robots which follow the existing `md` boundary.

**Tech Stack:** SvelteKit, TailwindCSS

---

## Files Modified

| File | Change |
|------|--------|
| `src/routes/+layout.svelte` | Two-row mobile header |
| `src/routes/bingo/+page.svelte` | Grid tiles: rounded squares on mobile |
| `src/routes/admin/users/[id]/+page.svelte` | Grid tiles: same as above |
| `src/routes/+page.svelte` | Smaller logo/title, robots below CTA on mobile |
| `src/routes/admin/+page.svelte` | Users table → card stack on mobile |
| `src/routes/admin/tiles/+page.svelte` | Tiles table → card stack on mobile |

---

## Task 1: Two-row mobile header

**Files:**
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: Replace the header**

Replace the entire `<header>` element with:

```svelte
<header class="border-b border-white/10">
  <div class="flex items-center justify-between px-6 py-3 sm:py-4">
    <a href="/" class="text-2xl font-extrabold tracking-wide text-emerald-200">
      <img src="/hacksu_footer.svg" alt="HACKSU logo" class="h-12 w-auto inline-block mr-2 -mt-1" />
      BINGO
    </a>
    <div class="flex items-center gap-4">
      {#if data.user?.role === 'admin'}
        <a href="/admin" class="text-sm hover:text-amber-200 text-amber-300 transition">Admin</a>
      {/if}
      <nav class="hidden sm:flex items-center gap-4 text-sm">
        {#if data.user}
          <a href="/bingo" class="hover:text-white text-slate-300 transition">My Card</a>
          <button
            onclick={handleSignOut}
            class="rounded-md bg-white/5 hover:bg-white/10 px-3 py-1.5 border border-white/10 transition"
          >
            Sign out
          </button>
        {:else}
          <a
            href="/login"
            class="rounded-md bg-emerald-500 text-emerald-950 hover:bg-emerald-400 px-3 py-1.5 font-semibold transition"
          >
            Sign in
          </a>
        {/if}
      </nav>
    </div>
  </div>
  <div class="sm:hidden flex gap-2 px-6 pb-3">
    {#if data.user}
      <a
        href="/bingo"
        class="flex-1 text-center rounded-md bg-white/5 border border-white/10 text-slate-300 hover:text-white px-3 py-1.5 text-sm font-medium transition"
      >
        My Card
      </a>
      <button
        onclick={handleSignOut}
        class="flex-1 rounded-md bg-white/5 hover:bg-white/10 px-3 py-1.5 border border-white/10 text-sm transition"
      >
        Sign out
      </button>
    {:else}
      <a
        href="/login"
        class="flex-1 text-center rounded-md bg-emerald-500 text-emerald-950 hover:bg-emerald-400 px-3 py-1.5 text-sm font-semibold transition"
      >
        Sign in
      </a>
    {/if}
  </div>
</header>
```

- [ ] **Step 2: Verify visually**

Run `bun dev` and open the app at a mobile width (375px). Confirm:
- Row 1: BINGO logo left, Admin link right (if admin)
- Row 2: My Card + Sign out buttons full-width
- At 640px+ the header collapses to one row as before

---

## Task 2: Bingo grid — rounded squares on mobile

**Files:**
- Modify: `src/routes/bingo/+page.svelte`

- [ ] **Step 1: Update grid gap**

Find:
```svelte
class="grid gap-3 sm:gap-4 mx-auto"
```

Replace with:
```svelte
class="grid gap-2 sm:gap-3 mx-auto"
```

- [ ] **Step 2: Update tile button classes**

Find the `class=` on the `<button type="submit"` inside the grid. The current value starts with:
```
"w-full h-full rounded-full flex items-center justify-center text-center
       text-[0.7rem] sm:text-xs font-bold leading-tight p-2 transition
```

Change `rounded-full` to `rounded-lg sm:rounded-full` and `p-2` to `p-1.5 sm:p-2`:
```
"w-full h-full rounded-lg sm:rounded-full flex items-center justify-center text-center
       text-[0.7rem] sm:text-xs font-bold leading-tight p-1.5 sm:p-2 transition
```

- [ ] **Step 3: Verify visually**

At mobile width (375px) the tiles should be rounded squares with text fitting inside. At 640px+ they should be circles as before.

---

## Task 3: Admin user detail grid — rounded squares on mobile

**Files:**
- Modify: `src/routes/admin/users/[id]/+page.svelte`

- [ ] **Step 1: Update grid gap**

Find:
```svelte
class="grid gap-3 sm:gap-4 mx-auto max-w-3xl"
```

Replace with:
```svelte
class="grid gap-2 sm:gap-3 mx-auto max-w-3xl"
```

- [ ] **Step 2: Update tile div classes**

Find the `<div` inside the grid with class starting:
```
"aspect-square w-full rounded-full flex items-center justify-center text-center
             text-[0.7rem] sm:text-xs font-bold leading-tight p-2
```

Change `rounded-full` to `rounded-lg sm:rounded-full` and `p-2` to `p-1.5 sm:p-2`:
```
"aspect-square w-full rounded-lg sm:rounded-full flex items-center justify-center text-center
             text-[0.7rem] sm:text-xs font-bold leading-tight p-1.5 sm:p-2
```

- [ ] **Step 3: Verify visually**

Navigate to any user's detail page at mobile width. Tiles should be rounded squares.

---

## Task 4: Landing page — logo, title, robots on mobile

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Shrink logo on mobile**

Find:
```svelte
<img src="/hacksu_logo.svg" alt="HACKSU logo" class="h-60 w-auto inline-block mr-3 -mt-2" />
```

Replace with:
```svelte
<img src="/hacksu_logo.svg" alt="HACKSU logo" class="h-36 sm:h-60 w-auto inline-block mr-3 -mt-2" />
```

- [ ] **Step 2: Shrink title on mobile**

Find:
```svelte
<h1 class="text-5xl font-extrabold tracking-tight">
```

Replace with:
```svelte
<h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight">
```

- [ ] **Step 3: Add robots below CTA on mobile**

The CTA block currently ends with the closing `{/if}` after the sign-in/sign-up links. Add a robot row immediately after that `{/if}` and before `</section>`:

```svelte
    <div class="flex justify-center items-end gap-8 md:hidden">
      <div style="transform: rotate(-8deg);">
        <RobotGreen size="96px" animated />
      </div>
      <div style="transform: rotate(8deg);">
        <RobotBlue size="96px" animated />
      </div>
    </div>
```

- [ ] **Step 4: Verify visually**

At mobile width: logo is smaller, title fits without awkward wrapping, robots appear below the button. At `md`+ the side robots show and the bottom row disappears.

---

## Task 5: Admin users page — card stack on mobile

**Files:**
- Modify: `src/routes/admin/+page.svelte`

- [ ] **Step 1: Add `hidden sm:block` to the existing table wrapper**

Find:
```svelte
<div class="overflow-x-auto rounded-lg border border-white/10 bg-white/5">
```

Replace with:
```svelte
<div class="hidden sm:block overflow-x-auto rounded-lg border border-white/10 bg-white/5">
```

- [ ] **Step 2: Add mobile card stack above the table**

Insert the following block immediately before the table `<div class="hidden sm:block ...">`:

```svelte
<div class="sm:hidden space-y-3">
  {#each data.users as u (u.id)}
    <div
      class="rounded-lg border px-4 py-3 {u.hasBingo && !u.verified
        ? 'bg-amber-400/10 border-amber-400/30'
        : u.verified
          ? 'bg-emerald-400/5 border-emerald-400/20'
          : 'bg-white/5 border-white/10'}"
    >
      <div class="flex items-center justify-between mb-2">
        <div>
          <div class="font-semibold text-slate-100">{u.name}</div>
          <div class="text-xs text-slate-400 mt-0.5">{u.role} · {u.completed} / {data.tileCount}</div>
        </div>
        {#if u.verified}
          <span
            class="rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-2 py-0.5 text-xs font-semibold tracking-wide"
          >
            VERIFIED
          </span>
        {:else if u.hasBingo}
          <span
            class="rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 px-2 py-0.5 text-xs font-semibold tracking-wide"
          >
            BINGO
          </span>
        {/if}
      </div>
      <a
        href="/admin/users/{u.id}"
        class="block w-full text-center rounded-md px-3 py-1.5 text-sm font-semibold transition
               {u.hasBingo && !u.verified
          ? 'bg-amber-400 text-amber-950 hover:bg-amber-300'
          : u.verified
            ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 hover:bg-emerald-500/30'
            : 'bg-white/10 border border-white/10 text-slate-100 hover:bg-white/15'}"
      >
        {u.hasBingo && !u.verified ? 'Verify' : 'View'}
      </a>
    </div>
  {/each}
</div>
```

- [ ] **Step 3: Verify visually**

At mobile width: cards show with name, role/progress, optional badge, and action button. At 640px+: table shows, cards hidden.

---

## Task 6: Admin tiles page — card stack on mobile

**Files:**
- Modify: `src/routes/admin/tiles/+page.svelte`

- [ ] **Step 1: Add `hidden sm:block` to the existing table wrapper**

Find:
```svelte
<div class="overflow-x-auto rounded-lg border border-white/10 bg-white/5">
  <table class="w-full text-sm">
```

Replace with:
```svelte
<div class="hidden sm:block overflow-x-auto rounded-lg border border-white/10 bg-white/5">
  <table class="w-full text-sm">
```

- [ ] **Step 2: Add mobile card stack above the table**

Insert the following block immediately before the `<div class="hidden sm:block ...">` table wrapper:

```svelte
<div class="sm:hidden space-y-3">
  {#each data.tiles as tile (tile.id)}
    <div class="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
      <input
        type="text"
        name="label"
        value={tile.label}
        required
        form="upd-{tile.id}"
        class="w-full rounded-md bg-slate-900/60 border border-white/10 text-slate-100 px-3 py-2 text-sm"
      />
      <div class="flex items-center gap-4 text-sm text-slate-300">
        <label class="flex items-center gap-1.5">
          Pos
          <input
            type="number"
            name="position"
            value={tile.position}
            min="0"
            form="upd-{tile.id}"
            class="w-16 rounded-md bg-slate-900/60 border border-white/10 text-slate-100 px-2 py-1 text-sm"
          />
        </label>
        <label class="flex items-center gap-1.5">
          <input type="checkbox" name="isActive" checked={tile.isActive} form="upd-{tile.id}" />
          Active
        </label>
        <label class="flex items-center gap-1.5">
          <input type="checkbox" name="isFreeSpace" checked={tile.isFreeSpace} form="upd-{tile.id}" />
          Free
        </label>
      </div>
      <div class="flex gap-2">
        <button
          type="submit"
          form="upd-{tile.id}"
          class="flex-1 rounded-md bg-emerald-500 text-emerald-950 font-semibold px-3 py-1.5 text-sm hover:bg-emerald-400 transition"
        >
          Save
        </button>
        <button
          type="submit"
          form="del-{tile.id}"
          class="flex-1 rounded-md bg-rose-500/80 text-white font-semibold px-3 py-1.5 text-sm hover:bg-rose-500 transition"
        >
          Delete
        </button>
      </div>
    </div>
  {/each}
</div>
```

Note: the hidden forms div (`<div class="hidden">`) is unchanged. The card inputs use `form="upd-{tile.id}"` and `form="del-{tile.id}"` to wire up to those existing forms — Save and Delete will work correctly on mobile.

- [ ] **Step 3: Verify visually**

At mobile width: each tile shows as a card with full-width label input, inline Pos/Active/Free controls, and Save/Delete buttons. Editing and saving a tile should work. At 640px+: table shows, cards hidden.


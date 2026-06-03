<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();

  const count = $derived(data.tiles.length);
  const isShort = $derived(count < data.target);
  const isSurplus = $derived(count > data.target);
  const short = $derived(data.target - count);
  const surplus = $derived(count - data.target);
  const freeSpaceCount = $derived(data.tiles.filter((t) => t.isFreeSpace).length);

  const bulkError = $derived(form?.form === 'bulkAdd' && !form?.ok ? form?.message : null);
  const bulkSuccess = $derived(
    form?.form === 'bulkAdd' && form?.ok
      ? `Added ${(form as { added?: number }).added ?? 0} tile${(form as { added?: number }).added === 1 ? '' : 's'}.`
      : null
  );
</script>

<header class="space-y-1 text-center">
  <h1 class="text-3xl font-extrabold tracking-tight">Tiles</h1>
  <p class="text-sm text-slate-300">Edit labels, reorder by position, toggle active/free-space.</p>
</header>

<div class="space-y-2">
  <div
    class="rounded-lg border px-4 py-3 text-sm text-center
           {isShort
      ? 'border-amber-400/40 bg-amber-500/15 text-amber-100'
      : 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'}"
  >
    <span class="font-semibold">{count}</span> tile{count === 1 ? '' : 's'} in pool —
    cards are {data.gridSize}×{data.gridSize} ({data.target} per card).
    {#if isShort}
      <span class="font-semibold">{short} more needed</span> for a complete card.
    {:else if isSurplus}
      Each player gets a random {data.target} from the pool
      ({surplus} extra{surplus === 1 ? '' : 's'} for variety).
    {:else}
      Pool exactly fills the card; every player sees the same {data.target} tiles in their own shuffled order.
    {/if}
  </div>

  <div
    class="rounded-lg border px-4 py-2 text-sm text-center
           {freeSpaceCount === 1
      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
      : 'border-amber-400/40 bg-amber-500/15 text-amber-100'}"
  >
    {#if freeSpaceCount === 1}
      Free space configured — pinned to the center of every card.
    {:else if freeSpaceCount === 0}
      <span class="font-semibold">No free-space tile.</span> Cards will be filled with {data.target} regular tiles and no center freebie. Mark one tile as
      <span class="font-mono">Free</span> below to enable it.
    {:else}
      <span class="font-semibold">{freeSpaceCount} free-space tiles configured.</span> Only one will be used per card (the others are dropped). Unmark the extras to fit them into the regular pool.
    {/if}
  </div>
</div>

<form
  method="POST"
  action="?/bulkAdd"
  use:enhance
  enctype="multipart/form-data"
  class="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3"
>
  <div class="flex flex-wrap gap-2 items-center">
    <input
      type="file"
      name="file"
      accept=".csv,text/csv,text/plain"
      required
      class="flex-1 min-w-64 text-sm text-slate-200 file:mr-3 file:rounded-md
             file:bg-emerald-500/20 file:border file:border-emerald-400/40 file:text-emerald-100
             file:px-3 file:py-1.5 file:font-semibold hover:file:bg-emerald-500/30"
    />
    <button
      type="submit"
      class="rounded-md bg-emerald-500 text-emerald-950 font-semibold px-4 py-2 hover:bg-emerald-400 transition"
    >
      Bulk add
    </button>
  </div>
  <p class="text-xs text-slate-400">
    One label per line. Will be appended to existing tiles. Total must reach at least 25 after
    upload — partial cards are rejected.
  </p>
  {#if bulkError}
    <p class="text-sm text-rose-300 font-semibold">{bulkError}</p>
  {:else if bulkSuccess}
    <p class="text-sm text-emerald-300 font-semibold">{bulkSuccess}</p>
  {/if}
</form>

<form
  method="POST"
  action="?/create"
  use:enhance
  class="flex flex-wrap gap-2 items-center rounded-lg border border-white/10 bg-white/5 p-3"
>
  <input
    type="text"
    name="label"
    placeholder="New tile label"
    required
    class="flex-1 min-w-64 rounded-md bg-slate-900/60 border border-white/10 text-slate-100 px-3 py-2 placeholder:text-slate-400"
  />
  <button
    type="submit"
    class="rounded-md bg-emerald-500 text-emerald-950 font-semibold px-4 py-2 hover:bg-emerald-400 transition"
  >
    Add tile
  </button>
</form>

<!-- Forms live outside the table; rows reference them via the `form` attribute. -->
<div class="hidden">
  {#each data.tiles as tile (tile.id)}
    <form method="POST" action="?/update" use:enhance id="upd-{tile.id}">
      <input type="hidden" name="id" value={tile.id} />
    </form>
    <form
      method="POST"
      action="?/delete"
      use:enhance={() => {
        return async ({ update }) => update();
      }}
      id="del-{tile.id}"
      onsubmit={(e) => {
        if (!confirm(`Delete this tile?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={tile.id} />
    </form>
  {/each}
</div>

<div class="sm:hidden space-y-3">
  {#each data.tiles as tile (tile.id)}
    <div class="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
      <form method="POST" action="?/update" use:enhance class="space-y-2">
        <input type="hidden" name="id" value={tile.id} />
        <input
          type="text"
          name="label"
          value={tile.label}
          required
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
              class="w-16 rounded-md bg-slate-900/60 border border-white/10 text-slate-100 px-2 py-1 text-sm"
            />
          </label>
          <label class="flex items-center gap-1.5">
            <input type="checkbox" name="isActive" checked={tile.isActive} />
            Active
          </label>
          <label class="flex items-center gap-1.5">
            <input type="checkbox" name="isFreeSpace" checked={tile.isFreeSpace} />
            Free
          </label>
        </div>
        <button
          type="submit"
          class="w-full rounded-md bg-emerald-500 text-emerald-950 font-semibold px-3 py-1.5 text-sm hover:bg-emerald-400 transition"
        >
          Save
        </button>
      </form>
      <form
        method="POST"
        action="?/delete"
        use:enhance={() => {
          return async ({ update }) => update();
        }}
        onsubmit={(e) => {
          if (!confirm(`Delete this tile?`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={tile.id} />
        <button
          type="submit"
          class="w-full rounded-md bg-rose-500/80 text-white font-semibold px-3 py-1.5 text-sm hover:bg-rose-500 transition"
        >
          Delete
        </button>
      </form>
    </div>
  {/each}
</div>

<div class="hidden sm:block overflow-x-auto rounded-lg border border-white/10 bg-white/5">
  <table class="w-full text-sm">
    <thead class="bg-white/5 text-left text-slate-300 uppercase text-xs tracking-wider">
      <tr>
        <th class="px-3 py-2 w-16">Pos</th>
        <th class="px-3 py-2">Label</th>
        <th class="px-3 py-2 w-20 text-center">Active</th>
        <th class="px-3 py-2 w-20 text-center">Free</th>
        <th class="px-3 py-2 w-48"></th>
      </tr>
    </thead>
    <tbody>
      {#each data.tiles as tile (tile.id)}
        <tr class="border-t border-white/10 hover:bg-white/5">
          <td class="px-3 py-2">
            <input
              type="number"
              name="position"
              value={tile.position}
              min="0"
              form="upd-{tile.id}"
              class="w-16 rounded-md bg-slate-900/60 border border-white/10 text-slate-100 px-2 py-1"
            />
          </td>
          <td class="px-3 py-2">
            <input
              type="text"
              name="label"
              value={tile.label}
              required
              form="upd-{tile.id}"
              class="w-full rounded-md bg-slate-900/60 border border-white/10 text-slate-100 px-2 py-1"
            />
          </td>
          <td class="px-3 py-2 text-center">
            <input type="checkbox" name="isActive" checked={tile.isActive} form="upd-{tile.id}" />
          </td>
          <td class="px-3 py-2 text-center">
            <input
              type="checkbox"
              name="isFreeSpace"
              checked={tile.isFreeSpace}
              form="upd-{tile.id}"
            />
          </td>
          <td class="px-3 py-2 flex gap-2 justify-end">
            <button
              type="submit"
              form="upd-{tile.id}"
              class="rounded-md bg-emerald-500 text-emerald-950 font-semibold px-3 py-1 hover:bg-emerald-400 transition"
            >
              Save
            </button>
            <button
              type="submit"
              form="del-{tile.id}"
              class="rounded-md bg-rose-500/80 text-white font-semibold px-3 py-1 hover:bg-rose-500 transition"
            >
              Delete
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

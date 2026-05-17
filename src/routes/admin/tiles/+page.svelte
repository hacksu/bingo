<script lang="ts">
  import { enhance } from '$app/forms';

  let { data } = $props();
</script>

<header class="space-y-1 text-center">
  <h1 class="text-3xl font-extrabold tracking-tight">Tiles</h1>
  <p class="text-sm text-slate-300">Edit labels, reorder by position, toggle active/free-space.</p>
</header>

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

<div class="overflow-x-auto rounded-lg border border-white/10 bg-white/5">
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

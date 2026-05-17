<script lang="ts">
  import { enhance } from '$app/forms';
  import { GRID_SIZE } from '$lib/bingo';

  let { data } = $props();

  const completedCount = $derived(data.tiles.filter((t) => t.selfMarked).length);
</script>

<header class="flex items-center gap-4">
  <a href="/admin" class="text-sm opacity-80 hover:underline">← Users</a>
</header>

<div class="flex flex-wrap items-center gap-4">
  {#if data.target.image}
    <img src={data.target.image} alt="" class="h-12 w-12 rounded-full" />
  {/if}
  <div>
    <h1 class="text-2xl font-extrabold">{data.target.name}</h1>
    <p class="text-sm opacity-80">{data.target.email}</p>
  </div>
  <span class="ml-auto rounded-md bg-white/10 px-3 py-1 text-sm">
    {completedCount} / {data.tiles.filter((t) => t.isActive && !t.isFreeSpace).length} marked
  </span>
</div>

{#if data.hasBingo}
  <div
    class="rounded-xl bg-yellow-400 text-yellow-950 px-5 py-4 ring-4 ring-yellow-300"
  >
    <div class="text-xl font-extrabold">🎉 BINGO — winning line highlighted</div>
    <div class="text-sm font-semibold opacity-90">
      Verify each highlighted tile reflects something this player actually completed before awarding
      the prize.
    </div>
  </div>
{/if}

<p class="text-sm opacity-80">
  Click a tile to verify (mark complete) or unverify (clear). Free-space tiles always count for the
  user but can also be toggled here.
</p>

<div
  class="grid gap-3 sm:gap-4 mx-auto max-w-3xl"
  style="grid-template-columns: repeat({GRID_SIZE}, minmax(0, 1fr));"
>
  {#each data.tiles as tile (tile.id)}
    <form method="POST" action="?/toggle" use:enhance class="aspect-square">
      <input type="hidden" name="tileId" value={tile.id} />
      <button
        type="submit"
        class="w-full h-full rounded-full flex items-center justify-center text-center
               text-[0.7rem] sm:text-xs font-bold leading-tight p-2 transition cursor-pointer
               {tile.completed
          ? tile.winning
            ? 'bg-yellow-400 text-yellow-950 ring-4 ring-yellow-300'
            : 'bg-emerald-500/90 text-white ring-4 ring-emerald-300'
          : 'bg-white text-slate-800 hover:bg-white/90'}"
        title={tile.isFreeSpace ? 'Free space' : tile.label}
      >
        {tile.label}
      </button>
    </form>
  {/each}
</div>

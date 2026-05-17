<script lang="ts">
  import { enhance } from '$app/forms';
  import { GRID_SIZE } from '$lib/bingo';

  let { data } = $props();
</script>

<section class="mx-auto max-w-3xl space-y-6">
  <header class="text-center space-y-1">
    <h1 class="text-4xl font-extrabold">Your Bingo Card</h1>
    <p class="opacity-80 text-sm">Click a tile to mark it complete.</p>
  </header>

  {#if data.hasBingo}
    <div
      class="rounded-xl bg-yellow-400 text-yellow-950 px-5 py-4 text-center ring-4 ring-yellow-300 animate-pulse"
    >
      <div class="text-2xl font-extrabold tracking-wider">🎉 BINGO!</div>
      <div class="text-sm font-semibold">
        Show this screen to a HacKSU organizer to claim your prize.
      </div>
    </div>
  {/if}

  <div
    class="grid gap-3 sm:gap-4 mx-auto"
    style="grid-template-columns: repeat({GRID_SIZE}, minmax(0, 1fr));"
  >
    {#each data.tiles as tile (tile.id)}
      <form method="POST" action="?/toggle" use:enhance class="aspect-square">
        <input type="hidden" name="tileId" value={tile.id} />
        <button
          type="submit"
          disabled={tile.isFreeSpace}
          class="w-full h-full rounded-full flex items-center justify-center text-center
                 text-[0.7rem] sm:text-xs font-bold leading-tight p-2 transition
                 {tile.completed
            ? tile.winning
              ? 'bg-yellow-400 text-yellow-950 ring-4 ring-yellow-300'
              : 'bg-red-500/90 text-white ring-4 ring-red-300'
            : 'bg-white text-slate-800 hover:bg-white/90'}
                 {tile.isFreeSpace ? 'cursor-default' : 'cursor-pointer'}"
        >
          {tile.label}
        </button>
      </form>
    {/each}
  </div>
</section>

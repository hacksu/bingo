<script lang="ts">
  import { enhance } from '$app/forms';
  import { GRID_SIZE } from '$lib/bingo';
  import SlideToConfirm from '$lib/SlideToConfirm.svelte';

  let { data } = $props();

  const isVerified = $derived(!!data.verifiedAt);
  const hasAnyProgress = $derived(data.tiles.some((t) => t.completed && !t.isFreeSpace));

  let resetForm: HTMLFormElement | undefined = $state();
</script>

<section class="mx-auto max-w-3xl space-y-6">
  <header class="text-center space-y-1">
    <h1 class="text-4xl font-extrabold">Your Bingo Card</h1>
    <p class="opacity-80 text-sm">Click a tile to mark it complete.</p>
  </header>

  {#if isVerified && data.hasBingo}
    <div class="rounded-xl bg-emerald-500 text-emerald-950 px-5 py-4 text-center ring-4 ring-emerald-300">
      <div class="text-2xl font-extrabold tracking-wider">✓ VERIFIED BINGO</div>
      <div class="text-sm font-semibold">
        Confirmed by an organizer on {new Date(data.verifiedAt!).toLocaleString()}.
      </div>
    </div>
  {:else if data.hasBingo}
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
              ? isVerified
                ? 'bg-emerald-400 text-emerald-950 ring-4 ring-emerald-300'
                : 'bg-yellow-400 text-yellow-950 ring-4 ring-yellow-300'
              : 'bg-red-500/90 text-white ring-4 ring-red-300'
            : 'bg-white text-slate-800 hover:bg-white/90'}
                 {tile.isFreeSpace ? 'cursor-default' : 'cursor-pointer'}"
        >
          {tile.label}
        </button>
      </form>
    {/each}
  </div>

  {#if hasAnyProgress}
    <div class="rounded-xl border-2 border-red-500/50 bg-red-500/10 px-5 py-4 space-y-3">
      <div>
        <div class="font-extrabold text-red-200">Reset card</div>
        <p class="text-sm opacity-80">
          Clears every tile you've marked{isVerified ? ' and removes your verification' : ''}.
          Cannot be undone.
        </p>
      </div>
      <form method="POST" action="?/reset" use:enhance bind:this={resetForm}>
        <SlideToConfirm
          variant="danger"
          label="Slide to reset your card"
          confirmedLabel="✓ Resetting…"
          onconfirm={() => resetForm?.requestSubmit()}
        />
      </form>
    </div>
  {/if}
</section>

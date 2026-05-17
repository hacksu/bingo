<script lang="ts">
  import { enhance } from '$app/forms';
  import { GRID_SIZE } from '$lib/bingo';
  import RobotGreen from '$lib/RobotGreen.svelte';
  import RobotBlue from '$lib/RobotBlue.svelte';

  let { data } = $props();

  const isVerified = $derived(!!data.verifiedAt);
  const hasAnyProgress = $derived(data.tiles.some((t) => t.completed && !t.isFreeSpace));

  let resetArmed = $state(false);
</script>

<div class="flex items-center justify-center gap-8">
  <div class="hidden lg:block">
    <RobotGreen size="200px" animated />
  </div>

  <section class="mx-auto max-w-3xl space-y-6">
    <header class="text-center space-y-1">
      <h1 class="text-4xl font-extrabold tracking-tight">{(data.user?.name ?? 'User').toUpperCase()}'S BINGO CARD</h1>
      <p class="text-slate-300 text-sm">Tap a tile to mark it complete.</p>
    </header>

  {#if isVerified && data.hasBingo}
    <div
      class="rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-100 px-5 py-4 text-center"
    >
      <div class="text-xl font-extrabold tracking-wider text-emerald-200">VERIFIED BINGO</div>
      <div class="text-sm text-emerald-100/80 mt-1">
        Confirmed on {new Date(data.verifiedAt!).toLocaleString()} by {data.verifiedBy}.
      </div>
    </div>
  {:else if data.hasBingo}
    <div
      class="rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-100 px-5 py-4 text-center"
    >
      <div class="text-xl font-extrabold tracking-wider text-amber-200">BINGO</div>
      <div class="text-sm text-amber-100/80 mt-1">
        Show this screen to a HacKSU Leader to claim your prize.
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
          disabled={tile.isFreeSpace || !tile.isActive}
          title={!tile.isActive ? 'Locked — not yet available' : tile.label}
          class="w-full h-full rounded-full flex items-center justify-center text-center
                 text-[0.7rem] sm:text-xs font-bold leading-tight p-2 transition
                 {!tile.isActive
            ? 'bg-slate-800/60 text-slate-400 border border-slate-600/40 cursor-not-allowed'
            : tile.completed
              ? tile.winning
                ? isVerified
                  ? 'bg-emerald-400 text-emerald-950 ring-2 ring-emerald-200'
                  : 'bg-amber-400 text-amber-950 ring-2 ring-amber-200'
                : 'bg-emerald-500 text-emerald-950'
              : 'bg-slate-100 text-slate-800 hover:bg-white cursor-pointer'}
                 {tile.isFreeSpace ? 'cursor-default' : ''}"
        >
          {tile.label}
        </button>
      </form>
    {/each}
  </div>

  {#if hasAnyProgress}
    <div
      class="rounded-xl border border-rose-400/30 bg-rose-500/10 px-5 py-4 space-y-3 text-center"
    >
      <div>
        <div class="font-extrabold text-rose-200 tracking-wide">Reset card</div>
        <p class="text-sm text-rose-100/80 mt-1">
          Clears every tile you've marked{isVerified ? ' and removes your verification' : ''}.
          Cannot be undone.
        </p>
      </div>

      {#if !resetArmed}
        <button
          type="button"
          onclick={() => (resetArmed = true)}
          class="rounded-md bg-rose-500 text-white font-semibold px-5 py-2 hover:bg-rose-400 transition"
        >
          Reset card
        </button>
      {:else}
        <div class="flex flex-wrap items-center justify-center gap-2">
          <span class="text-sm font-semibold text-rose-200">Really reset your card?</span>
          <form
            method="POST"
            action="?/reset"
            use:enhance={() => {
              return async ({ update }) => {
                resetArmed = false;
                await update();
              };
            }}
          >
            <button
              type="submit"
              class="rounded-md bg-rose-500 text-white font-semibold px-5 py-2 hover:bg-rose-400 transition"
            >
              Yes, reset
            </button>
          </form>
          <button
            type="button"
            onclick={() => (resetArmed = false)}
            class="rounded-md bg-white/5 border border-white/10 text-slate-200 font-semibold px-4 py-2 hover:bg-white/10 transition"
          >
            Cancel
          </button>
        </div>
      {/if}
    </div>
  {/if}
  </section>

  <div class="hidden lg:block">
    <RobotBlue size="200px" animated />
  </div>
</div>

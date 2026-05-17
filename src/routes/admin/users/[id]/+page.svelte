<script lang="ts">
  import { enhance } from '$app/forms';
  import { GRID_SIZE } from '$lib/bingo';

  let { data, form } = $props();

  const completedCount = $derived(data.tiles.filter((t) => t.selfMarked).length);
  const isVerified = $derived(!!data.target.bingoVerifiedAt);
  const expectedName = $derived(data.target.name.trim());

  let typed = $state('');
  const typedMatches = $derived(typed.trim().toLowerCase() === expectedName.toLowerCase());
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

{#if isVerified && data.hasBingo}
  <div class="rounded-xl bg-emerald-500 text-emerald-950 px-5 py-4 ring-4 ring-emerald-300 space-y-3">
    <div class="text-xl font-extrabold">✓ Verified</div>
    <div class="text-sm font-semibold opacity-90">
      Verified at {new Date(data.target.bingoVerifiedAt!).toLocaleString()}.
    </div>
    <form method="POST" action="?/unverify" use:enhance>
      <button
        type="submit"
        class="rounded-md bg-emerald-950 text-emerald-100 font-semibold px-3 py-1.5 hover:bg-emerald-900"
      >
        Unverify
      </button>
    </form>
  </div>
{:else if isVerified && !data.hasBingo}
  <div class="rounded-xl bg-orange-400 text-orange-950 px-5 py-4 ring-4 ring-orange-300 space-y-3">
    <div class="text-xl font-extrabold">⚠ Verified, but card no longer shows bingo</div>
    <div class="text-sm font-semibold opacity-90">
      The player toggled a tile after being verified. Unverify, or wait for them to restore.
    </div>
    <form method="POST" action="?/unverify" use:enhance>
      <button
        type="submit"
        class="rounded-md bg-orange-950 text-orange-100 font-semibold px-3 py-1.5 hover:bg-orange-900"
      >
        Unverify
      </button>
    </form>
  </div>
{:else if data.hasBingo}
  <div class="rounded-xl bg-yellow-400 text-yellow-950 px-5 py-5 ring-4 ring-yellow-300 space-y-3">
    <div class="text-xl font-extrabold">🎉 BINGO — winning line highlighted</div>
    <p class="text-sm font-semibold opacity-90">
      Look over the card. If the player legitimately earned these tiles, type their name below to
      confirm.
    </p>
    <form method="POST" action="?/verify" use:enhance class="flex flex-wrap gap-2 items-center">
      <input
        type="text"
        name="confirm"
        bind:value={typed}
        placeholder="Type “{expectedName}” to confirm"
        autocomplete="off"
        class="flex-1 min-w-56 rounded-md bg-white text-yellow-950 placeholder:text-yellow-900/60 px-3 py-2 font-semibold"
      />
      <button
        type="submit"
        disabled={!typedMatches}
        class="rounded-md px-4 py-2 font-extrabold transition
               {typedMatches
          ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 cursor-pointer'
          : 'bg-yellow-300 text-yellow-900 opacity-60 cursor-not-allowed'}"
      >
        Verify Bingo
      </button>
    </form>
    {#if form?.message}
      <p class="text-sm font-semibold text-red-900">{form.message}</p>
    {/if}
  </div>
{:else}
  <div class="rounded-lg bg-white/10 px-4 py-3 text-sm opacity-80">
    Player has not completed a bingo yet.
  </div>
{/if}

<div
  class="grid gap-3 sm:gap-4 mx-auto max-w-3xl"
  style="grid-template-columns: repeat({GRID_SIZE}, minmax(0, 1fr));"
>
  {#each data.tiles as tile (tile.id)}
    <div
      class="aspect-square w-full rounded-full flex items-center justify-center text-center
             text-[0.7rem] sm:text-xs font-bold leading-tight p-2
             {tile.completed
        ? tile.winning
          ? 'bg-yellow-400 text-yellow-950 ring-4 ring-yellow-300'
          : 'bg-emerald-500/90 text-white ring-4 ring-emerald-300'
        : 'bg-white text-slate-800'}"
      title={tile.isFreeSpace ? 'Free space' : tile.label}
    >
      {tile.label}
    </div>
  {/each}
</div>

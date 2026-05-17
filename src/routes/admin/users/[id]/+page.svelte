<script lang="ts">
  import { enhance } from '$app/forms';
  import { GRID_SIZE } from '$lib/bingo';
  import SlideToConfirm from '$lib/SlideToConfirm.svelte';

  let { data, form } = $props();

  const completedCount = $derived(data.tiles.filter((t) => t.selfMarked).length);
  const isVerified = $derived(!!data.target.bingoVerifiedAt);

  let verifyForm: HTMLFormElement | undefined = $state();
  let resetArmed = $state(false);

  const hasAnyProgress = $derived(data.tiles.some((t) => t.selfMarked) || isVerified);
</script>

<header class="flex items-center gap-4">
  <a href="/admin" class="text-sm text-slate-300 hover:text-white transition">← Users</a>
</header>

<div class="flex flex-wrap items-center gap-4">
  {#if data.target.image}
    <img src={data.target.image} alt="" class="h-12 w-12 rounded-full ring-1 ring-white/20" />
  {/if}
  <div>
    <h1 class="text-2xl font-extrabold tracking-tight">{data.target.name}</h1>
    <p class="text-sm text-slate-300">{data.target.email}</p>
  </div>
  <span class="ml-auto rounded-md bg-white/5 border border-white/10 px-3 py-1 text-sm text-slate-200">
    {completedCount} / {data.tiles.filter((t) => t.isActive && !t.isFreeSpace).length} marked
  </span>
</div>

{#if isVerified && data.hasBingo}
  <div
    class="rounded-xl bg-emerald-500/15 border border-emerald-400/40 px-5 py-4 space-y-3 text-center"
  >
    <div class="text-lg font-extrabold tracking-wide text-emerald-200">Verified</div>
    <div class="text-sm text-emerald-100/80">
      Verified at {new Date(data.target.bingoVerifiedAt!).toLocaleString()}.
    </div>
    <form method="POST" action="?/unverify" use:enhance>
      <button
        type="submit"
        class="rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 font-semibold px-4 py-1.5 hover:bg-emerald-500/30 transition"
      >
        Unverify
      </button>
    </form>
  </div>
{:else if isVerified && !data.hasBingo}
  <div
    class="rounded-xl bg-amber-500/15 border border-amber-400/40 px-5 py-4 space-y-3 text-center"
  >
    <div class="text-lg font-extrabold tracking-wide text-amber-200">
      Verified, but card no longer shows bingo
    </div>
    <div class="text-sm text-amber-100/80">
      The player toggled a tile after being verified. Unverify, or wait for them to restore.
    </div>
    <form method="POST" action="?/unverify" use:enhance>
      <button
        type="submit"
        class="rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-100 font-semibold px-4 py-1.5 hover:bg-amber-500/30 transition"
      >
        Unverify
      </button>
    </form>
  </div>
{:else if data.hasBingo}
  <div
    class="rounded-xl bg-amber-500/15 border border-amber-400/40 px-5 py-5 space-y-4 text-center"
  >
    <div class="text-lg font-extrabold tracking-wide text-amber-200">
      Bingo — winning line highlighted
    </div>
    <p class="text-sm text-amber-100/80 max-w-prose mx-auto">
      Look the card over. If the player legitimately earned these tiles, slide to verify.
    </p>
    <form method="POST" action="?/verify" use:enhance bind:this={verifyForm}>
      <SlideToConfirm
        label="Slide to verify {data.target.name}'s bingo"
        confirmedLabel="Verifying"
        onconfirm={() => verifyForm?.requestSubmit()}
      />
    </form>
    {#if form?.message}
      <p class="text-sm font-semibold text-rose-300">{form.message}</p>
    {/if}
  </div>
{:else}
  <div
    class="rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm text-slate-300 text-center"
  >
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
          ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-200'
          : 'bg-emerald-500 text-emerald-950'
        : 'bg-slate-100 text-slate-800'}"
      title={tile.isFreeSpace ? 'Free space' : tile.label}
    >
      {tile.label}
    </div>
  {/each}
</div>

{#if hasAnyProgress}
  <div
    class="rounded-xl border border-rose-400/30 bg-rose-500/10 px-5 py-4 space-y-3 text-center"
  >
    <div>
      <div class="font-extrabold text-rose-200 tracking-wide">Reset card</div>
      <p class="text-sm text-rose-100/80 mt-1">
        Clears every tile {data.target.name} has marked{isVerified
          ? ' and removes their verification'
          : ''}. Cannot be undone.
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
        <span class="text-sm font-semibold text-rose-200">
          Really reset {data.target.name}'s card?
        </span>
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

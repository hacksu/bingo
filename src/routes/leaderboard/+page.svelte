<!-- src/routes/leaderboard/+page.svelte -->
<script lang="ts">
  import { livePoll } from '$lib/livePoll.svelte';

  let { data } = $props();

  livePoll('app:standings');

  function initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  function finishTime(d: Date | string): string {
    return new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
</script>

<section class="mx-auto max-w-3xl space-y-6">
  <header class="space-y-1 text-center">
    <h1 class="text-3xl font-extrabold tracking-tight">Leaderboard</h1>
    <p class="text-sm text-slate-300">
      {data.players.length} player{data.players.length === 1 ? '' : 's'} in the running
    </p>
  </header>

  {#if data.players.length === 0}
    <p class="rounded-lg border border-white/10 bg-white/5 px-4 py-8 text-center text-slate-300">
      No progress yet. Be the first to mark a tile!
    </p>
  {:else}
    <!-- Mobile: stacked cards -->
    <div class="sm:hidden space-y-3">
      {#each data.players as p (p.rank)}
        <div
          class="flex items-center gap-3 rounded-lg border px-4 py-3 {p.verifiedAt
            ? 'bg-emerald-400/5 border-emerald-400/20'
            : 'bg-white/5 border-white/10'}"
        >
          <span class="w-6 shrink-0 text-center font-bold text-slate-400">{p.rank}</span>
          {#if p.image}
            <img src={p.image} alt="" class="h-9 w-9 shrink-0 rounded-full object-cover" />
          {:else}
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-slate-200"
            >
              {initials(p.name)}
            </span>
          {/if}
          <div class="min-w-0 flex-1">
            <div class="truncate font-semibold text-slate-100">{p.name}</div>
            <div class="text-xs text-slate-400">{p.completed} / {data.markable}</div>
          </div>
          {#if p.verifiedAt}
            <span
              class="shrink-0 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-2 py-0.5 text-xs font-semibold tracking-wide"
            >
              {finishTime(p.verifiedAt)}
            </span>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Desktop: table -->
    <div class="hidden sm:block overflow-x-auto rounded-lg border border-white/10 bg-white/5">
      <table class="w-full text-sm">
        <thead class="bg-white/5 text-left text-slate-300 uppercase text-xs tracking-wider">
          <tr>
            <th class="px-4 py-2 w-12">#</th>
            <th class="px-4 py-2">Player</th>
            <th class="px-4 py-2">Progress</th>
            <th class="px-4 py-2 text-right">Finished</th>
          </tr>
        </thead>
        <tbody>
          {#each data.players as p (p.rank)}
            <tr
              class="border-t border-white/10 {p.verifiedAt
                ? 'bg-emerald-400/5 hover:bg-emerald-400/10'
                : 'hover:bg-white/5'}"
            >
              <td class="px-4 py-2 font-bold text-slate-400">{p.rank}</td>
              <td class="px-4 py-2">
                <div class="flex items-center gap-3 min-w-0">
                  {#if p.image}
                    <img src={p.image} alt="" class="h-8 w-8 shrink-0 rounded-full object-cover" />
                  {:else}
                    <span
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-slate-200"
                    >
                      {initials(p.name)}
                    </span>
                  {/if}
                  <span class="truncate font-semibold text-slate-100">{p.name}</span>
                </div>
              </td>
              <td class="px-4 py-2 text-slate-200">{p.completed} / {data.markable}</td>
              <td class="px-4 py-2 text-right">
                {#if p.verifiedAt}
                  <span
                    class="rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-2 py-0.5 text-xs font-semibold tracking-wide"
                  >
                    {finishTime(p.verifiedAt)}
                  </span>
                {:else}
                  <span class="text-slate-500">·</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

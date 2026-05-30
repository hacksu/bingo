<script lang="ts">
  import { livePoll } from '$lib/livePoll.svelte';

  let { data } = $props();

  livePoll('app:admin');
</script>

<header class="space-y-1 text-center">
  <h1 class="text-3xl font-extrabold tracking-tight">Users</h1>
  <p class="text-sm text-slate-300">
    {data.users.length} players · {data.tileCount} tiles
    {#if data.lockedCount > 0}
      (<span class="text-slate-400">{data.lockedCount} locked</span>)
    {/if}
    {#if data.pendingCount > 0}
      · <span class="text-amber-300 font-semibold">{data.pendingCount} pending</span>
    {/if}
    {#if data.verifiedCount > 0}
      · <span class="text-emerald-300 font-semibold">{data.verifiedCount} verified</span>
    {/if}
  </p>
</header>

{#if data.pendingCount > 0}
  <div
    class="rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-100 px-4 py-3 text-center"
  >
    <span class="font-semibold text-amber-200">
      {data.pendingCount} player{data.pendingCount === 1 ? '' : 's'} hit bingo
    </span>
    — verify their card{data.pendingCount === 1 ? '' : 's'} below.
  </div>
{/if}

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
          <div class="flex items-center gap-2 mt-0.5">
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide
                     {u.role === 'admin'
                ? 'bg-amber-500/20 border border-amber-400/40 text-amber-200'
                : 'bg-white/5 border border-white/10 text-slate-300'}"
            >
              {u.role}
            </span>
            <span class="text-xs text-slate-400">{u.completed} / {data.tileCount}</span>
          </div>
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

<div class="hidden sm:block overflow-x-auto rounded-lg border border-white/10 bg-white/5">
  <table class="w-full text-sm">
    <thead class="bg-white/5 text-left text-slate-300 uppercase text-xs tracking-wider">
      <tr>
        <th class="px-4 py-2">Status</th>
        <th class="px-4 py-2">Player</th>
        <th class="px-4 py-2">Role</th>
        <th class="px-4 py-2">Progress</th>
        <th class="px-4 py-2"></th>
      </tr>
    </thead>
    <tbody>
      {#each data.users as u (u.id)}
        <tr
          class="border-t border-white/10 {u.hasBingo && !u.verified
            ? 'bg-amber-400/10 hover:bg-amber-400/15'
            : u.verified
              ? 'bg-emerald-400/5 hover:bg-emerald-400/10'
              : 'hover:bg-white/5'}"
        >
          <td class="px-4 py-2">
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
          </td>
          <td class="px-4 py-2 font-semibold text-slate-100">{u.name}</td>
          <td class="px-4 py-2">
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide
                     {u.role === 'admin'
                ? 'bg-amber-500/20 border border-amber-400/40 text-amber-200'
                : 'bg-white/5 border border-white/10 text-slate-300'}"
            >
              {u.role}
            </span>
          </td>
          <td class="px-4 py-2 text-slate-200">{u.completed} / {data.tileCount}</td>
          <td class="px-4 py-2 text-right">
            <a
              href="/admin/users/{u.id}"
              class="rounded-md px-3 py-1 font-semibold transition
                     {u.hasBingo && !u.verified
                ? 'bg-amber-400 text-amber-950 hover:bg-amber-300'
                : u.verified
                  ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 hover:bg-emerald-500/30'
                  : 'bg-white/10 border border-white/10 text-slate-100 hover:bg-white/15'}"
            >
              {u.hasBingo && !u.verified ? 'Verify' : 'View'}
            </a>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

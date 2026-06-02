<!-- src/routes/admin/activity/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { livePoll } from '$lib/livePoll.svelte';
  import { eventLabel, badgeClass, TYPE_GROUPS, TYPE_LABEL, LIMIT_STEP } from '$lib/activityMeta';
  import SlideToConfirm from '$lib/SlideToConfirm.svelte';

  let { data } = $props();

  livePoll('app:activity');

  let purgeMode = $state<'all' | 'older'>('older');
  let purgeBefore = $state('');
  let purgeForm: HTMLFormElement;

  function initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  function when(d: Date | string): string {
    return new Date(d).toLocaleString();
  }

  function go(params: URLSearchParams) {
    const qs = params.toString();
    goto(qs ? `?${qs}` : '?', { keepFocus: true, noScroll: true });
  }

  function onTypeChange(e: Event) {
    const value = (e.currentTarget as HTMLSelectElement).value;
    const params = new URLSearchParams();
    if (value) params.set('type', value);
    if (data.filters.userId) params.set('user', data.filters.userId);
    go(params);
  }

  function onUserChange(e: Event) {
    const value = (e.currentTarget as HTMLSelectElement).value;
    const params = new URLSearchParams();
    if (data.filters.type) params.set('type', data.filters.type);
    if (value) params.set('user', value);
    go(params);
  }

  function loadMore() {
    const params = new URLSearchParams();
    if (data.filters.type) params.set('type', data.filters.type);
    if (data.filters.userId) params.set('user', data.filters.userId);
    params.set('limit', String(data.filters.limit + LIMIT_STEP));
    go(params);
  }

  function exportHref(format: 'csv' | 'json'): string {
    const params = new URLSearchParams();
    if (data.filters.type) params.set('type', data.filters.type);
    if (data.filters.userId) params.set('user', data.filters.userId);
    params.set('format', format);
    return `/admin/activity/export?${params.toString()}`;
  }
</script>

<header class="space-y-1 text-center">
  <h1 class="text-3xl font-extrabold tracking-tight">Activity</h1>
  <p class="text-sm text-slate-300">
    Showing {data.events.length}{data.hasMore ? '+' : ''} events
  </p>
</header>

<!-- Controls -->
<div class="flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
  <label class="flex flex-col gap-1 text-xs text-slate-300">
    Type
    <select
      class="rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-sm text-slate-100"
      value={data.filters.type ?? ''}
      onchange={onTypeChange}
    >
      <option value="">All types</option>
      {#each TYPE_GROUPS as group (group.label)}
        <optgroup label={group.label}>
          {#each group.types as t (t)}
            <option value={t}>{TYPE_LABEL[t]}</option>
          {/each}
        </optgroup>
      {/each}
    </select>
  </label>

  <label class="flex flex-col gap-1 text-xs text-slate-300">
    User
    <select
      class="rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-sm text-slate-100"
      value={data.filters.userId ?? ''}
      onchange={onUserChange}
    >
      <option value="">All users</option>
      {#each data.users as u (u.id)}
        <option value={u.id}>{u.name}</option>
      {/each}
    </select>
  </label>

  <div class="ml-auto flex items-end gap-2">
    <a
      href={exportHref('csv')}
      class="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-100 hover:bg-white/10"
    >
      Export CSV
    </a>
    <a
      href={exportHref('json')}
      class="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-100 hover:bg-white/10"
    >
      Export JSON
    </a>
  </div>
</div>

<!-- Purge -->
<details class="rounded-lg border border-rose-400/30 bg-rose-950/20 px-4 py-3">
  <summary class="cursor-pointer text-sm font-semibold text-rose-200">Purge activity log</summary>
  <form bind:this={purgeForm} method="POST" action="?/purge" class="mt-3 space-y-3">
    <div class="flex flex-wrap items-center gap-3 text-sm text-slate-200">
      <label class="flex items-center gap-2">
        <input type="radio" name="mode" value="older" bind:group={purgeMode} />
        Older than
      </label>
      <input
        type="date"
        name="before"
        bind:value={purgeBefore}
        disabled={purgeMode !== 'older'}
        class="rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-slate-100 disabled:opacity-40"
      />
      <label class="flex items-center gap-2">
        <input type="radio" name="mode" value="all" bind:group={purgeMode} />
        Everything
      </label>
    </div>
    <SlideToConfirm
      variant="danger"
      label="Slide to purge"
      confirmedLabel="Purging..."
      disabled={purgeMode === 'older' && !purgeBefore}
      onconfirm={() => purgeForm.requestSubmit()}
    />
  </form>
</details>

{#if data.events.length === 0}
  <p class="rounded-lg border border-white/10 bg-white/5 px-4 py-8 text-center text-slate-300">
    No activity matches these filters.
  </p>
{:else}
  <!-- Mobile: stacked cards -->
  <div class="sm:hidden space-y-3">
    {#each data.events as e (e.id)}
      <div class="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
        <div class="flex items-center gap-3">
          {#if e.userImage}
            <img src={e.userImage} alt="" class="h-9 w-9 shrink-0 rounded-full object-cover" />
          {:else}
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-slate-200"
            >
              {initials(e.userName)}
            </span>
          {/if}
          <div class="min-w-0 flex-1">
            <div class="truncate font-semibold text-slate-100">{e.userName}</div>
            <div class="text-xs text-slate-400">{when(e.createdAt)}</div>
          </div>
        </div>
        <div class="mt-2">
          <span class="rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide {badgeClass(e.type)}">
            {eventLabel(e.type, e.detail)}
          </span>
        </div>
      </div>
    {/each}
  </div>

  <!-- Desktop: table -->
  <div class="hidden sm:block overflow-x-auto rounded-lg border border-white/10 bg-white/5">
    <table class="w-full text-sm">
      <thead class="bg-white/5 text-left text-slate-300 uppercase text-xs tracking-wider">
        <tr>
          <th class="px-4 py-2">Time</th>
          <th class="px-4 py-2">Player</th>
          <th class="px-4 py-2">Event</th>
        </tr>
      </thead>
      <tbody>
        {#each data.events as e (e.id)}
          <tr class="border-t border-white/10 hover:bg-white/5">
            <td class="px-4 py-2 whitespace-nowrap text-slate-300">{when(e.createdAt)}</td>
            <td class="px-4 py-2">
              <div class="flex items-center gap-3 min-w-0">
                {#if e.userImage}
                  <img src={e.userImage} alt="" class="h-8 w-8 shrink-0 rounded-full object-cover" />
                {:else}
                  <span
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-slate-200"
                  >
                    {initials(e.userName)}
                  </span>
                {/if}
                <span class="truncate font-semibold text-slate-100">{e.userName}</span>
              </div>
            </td>
            <td class="px-4 py-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide {badgeClass(e.type)}">
                {eventLabel(e.type, e.detail)}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if data.hasMore}
    <div class="text-center">
      <button
        type="button"
        onclick={loadMore}
        class="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
      >
        Load more
      </button>
    </div>
  {/if}
{/if}

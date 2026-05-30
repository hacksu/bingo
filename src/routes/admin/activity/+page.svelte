<!-- src/routes/admin/activity/+page.svelte -->
<script lang="ts">
  let { data } = $props();

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

  function label(type: string, detail: string | null): string {
    if (type === 'login') return 'Signed in';
    if (type === 'logout') return 'Signed out';
    if (type === 'tile_complete') return `Completed "${detail ?? ''}"`;
    return type;
  }

  function badgeClass(type: string): string {
    return type === 'tile_complete'
      ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200'
      : 'bg-white/5 border border-white/10 text-slate-300';
  }
</script>

<header class="space-y-1 text-center">
  <h1 class="text-3xl font-extrabold tracking-tight">Activity</h1>
  <p class="text-sm text-slate-300">{data.events.length} most recent events</p>
</header>

{#if data.events.length === 0}
  <p class="rounded-lg border border-white/10 bg-white/5 px-4 py-8 text-center text-slate-300">
    No activity yet.
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
            {label(e.type, e.detail)}
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
                {label(e.type, e.detail)}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

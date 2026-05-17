<script lang="ts">
  let { data } = $props();
</script>

<header class="space-y-1">
  <h1 class="text-3xl font-extrabold">Users</h1>
  <p class="text-sm opacity-80">
    {data.users.length} players · {data.tileCount} active tiles
    {#if data.bingoCount > 0}
      · <span class="text-yellow-300 font-bold">{data.bingoCount} awaiting bingo verification</span>
    {/if}
  </p>
</header>

{#if data.bingoCount > 0}
  <div
    class="rounded-lg bg-yellow-400 text-yellow-950 px-4 py-3 font-bold ring-4 ring-yellow-300"
  >
    🎉 {data.bingoCount} player{data.bingoCount === 1 ? '' : 's'} hit BINGO — verify their card{data.bingoCount === 1 ? '' : 's'} below.
  </div>
{/if}

<div class="overflow-x-auto rounded-lg border border-white/20">
  <table class="w-full text-sm">
    <thead class="bg-white/10 text-left">
      <tr>
        <th class="px-4 py-2">Status</th>
        <th class="px-4 py-2">Player</th>
        <th class="px-4 py-2">Email</th>
        <th class="px-4 py-2">Role</th>
        <th class="px-4 py-2">Progress</th>
        <th class="px-4 py-2"></th>
      </tr>
    </thead>
    <tbody>
      {#each data.users as u (u.id)}
        <tr
          class="border-t border-white/10 {u.hasBingo
            ? 'bg-yellow-400/15 hover:bg-yellow-400/20'
            : ''}"
        >
          <td class="px-4 py-2">
            {#if u.hasBingo}
              <span
                class="rounded-full bg-yellow-400 text-yellow-950 px-2 py-0.5 text-xs font-extrabold"
              >
                BINGO
              </span>
            {/if}
          </td>
          <td class="px-4 py-2 font-semibold">{u.name}</td>
          <td class="px-4 py-2 opacity-80">{u.email}</td>
          <td class="px-4 py-2">
            <span
              class="rounded-full px-2 py-0.5 text-xs font-bold
                     {u.role === 'admin' ? 'bg-amber-400 text-amber-950' : 'bg-white/10'}"
            >
              {u.role}
            </span>
          </td>
          <td class="px-4 py-2">{u.completed} / {data.tileCount}</td>
          <td class="px-4 py-2 text-right">
            <a
              href="/admin/users/{u.id}"
              class="rounded-md px-3 py-1 font-semibold
                     {u.hasBingo
                ? 'bg-yellow-400 text-yellow-950 hover:bg-yellow-300'
                : 'bg-white text-blue-700 hover:bg-white/90'}"
            >
              {u.hasBingo ? 'Verify' : 'View card'}
            </a>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

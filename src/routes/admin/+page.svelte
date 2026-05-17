<script lang="ts">
  let { data } = $props();
</script>

<header class="space-y-1">
  <h1 class="text-3xl font-extrabold">Users</h1>
  <p class="text-sm opacity-80">
    {data.users.length} players · {data.tileCount} active tiles
  </p>
</header>

<div class="overflow-x-auto rounded-lg border border-white/20">
  <table class="w-full text-sm">
    <thead class="bg-white/10 text-left">
      <tr>
        <th class="px-4 py-2">Player</th>
        <th class="px-4 py-2">Email</th>
        <th class="px-4 py-2">Role</th>
        <th class="px-4 py-2">Progress</th>
        <th class="px-4 py-2"></th>
      </tr>
    </thead>
    <tbody>
      {#each data.users as u (u.id)}
        <tr class="border-t border-white/10">
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
              class="rounded-md bg-white text-blue-700 px-3 py-1 font-semibold hover:bg-white/90"
            >
              View card
            </a>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

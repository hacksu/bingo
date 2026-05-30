<script lang="ts">
  let { children } = $props();
</script>

<section class="mx-auto max-w-6xl space-y-6">
  <nav class="flex items-center gap-5 border-b border-white/10 pb-3 text-sm">
    <span class="text-xl font-extrabold tracking-tight text-amber-200">Admin</span>
    <a href="/admin" class="text-slate-300 hover:text-white transition">Users</a>
    <a href="/admin/tiles" class="text-slate-300 hover:text-white transition">Tiles</a>
    <a href="/admin/activity" class="text-slate-300 hover:text-white transition">Activity</a>
  </nav>
  {@render children()}
</section>

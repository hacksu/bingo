<script lang="ts">
  let { children } = $props();
</script>

<section class="mx-auto max-w-6xl space-y-6">
  <nav class="flex items-center gap-4 border-b border-white/20 pb-3 text-sm">
    <span class="text-xl font-extrabold">Admin</span>
    <a href="/admin" class="hover:underline">Users</a>
    <a href="/admin/tiles" class="hover:underline">Tiles</a>
  </nav>
  {@render children()}
</section>

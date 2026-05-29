<script lang="ts">
  import '../app.css';
  import { signOut } from '$lib/auth-client';
  import { goto } from '$app/navigation';

  let { data, children } = $props();

  async function handleSignOut() {
    await signOut();
    await goto('/');
  }
</script>

<header class="border-b border-white/10">
  <div class="flex items-center justify-between px-6 py-3 sm:py-4">
    <a href="/" class="text-2xl font-extrabold tracking-wide text-emerald-200">
      <img src="/hacksu_footer.svg" alt="HACKSU logo" class="h-12 w-auto inline-block mr-2 -mt-1" />
      BINGO
    </a>
    <div class="flex items-center gap-4">
      {#if data.user?.role === 'admin'}
        <a href="/admin" class="text-sm hover:text-amber-200 text-amber-300 transition">Admin</a>
      {/if}
      <nav class="hidden sm:flex items-center gap-4 text-sm">
        {#if data.user}
          <a href="/bingo" class="hover:text-white text-slate-300 transition">My Card</a>
          <button
            onclick={handleSignOut}
            class="rounded-md bg-white/5 hover:bg-white/10 px-3 py-1.5 border border-white/10 transition"
          >
            Sign out
          </button>
        {:else}
          <a
            href="/login"
            class="rounded-md bg-emerald-500 text-emerald-950 hover:bg-emerald-400 px-3 py-1.5 font-semibold transition"
          >
            Sign in
          </a>
        {/if}
      </nav>
    </div>
  </div>
  <div class="sm:hidden flex gap-2 px-6 pb-3">
    {#if data.user}
      <a
        href="/bingo"
        class="flex-1 text-center rounded-md bg-white/5 border border-white/10 text-slate-300 hover:text-white px-3 py-1.5 text-sm font-medium transition"
      >
        My Card
      </a>
      <button
        onclick={handleSignOut}
        class="flex-1 rounded-md bg-white/5 hover:bg-white/10 px-3 py-1.5 border border-white/10 text-sm transition"
      >
        Sign out
      </button>
    {:else}
      <a
        href="/login"
        class="flex-1 text-center rounded-md bg-emerald-500 text-emerald-950 hover:bg-emerald-400 px-3 py-1.5 text-sm font-semibold transition"
      >
        Sign in
      </a>
    {/if}
  </div>
</header>

<main class="px-6 py-8">
  {@render children()}
</main>

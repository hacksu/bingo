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

<header class="flex items-center justify-between px-6 py-4 border-b border-white/10">
  <a href="/" class="text-2xl font-extrabold tracking-wide text-emerald-200">
    <img src="/hacksu_footer.svg" alt="HACKSU logo" class="h-12 w-auto inline-block mr-2 -mt-1" />
    BINGO
  </a>
  {#if data.user.role === 'admin'}
        <a href="/admin" class="hover:text-amber-200 text-amber-300 transition">Admin</a>
      {/if}
  <nav class="flex items-center gap-4 text-sm">
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
</header>

<main class="px-6 py-8">
  {@render children()}
</main>

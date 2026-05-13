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

<header class="flex items-center justify-between px-6 py-4 border-b border-white/20">
  <a href="/" class="text-2xl font-extrabold tracking-wide">HACKSU BINGO</a>
  <nav class="flex items-center gap-4 text-sm">
    {#if data.user}
      <a href="/bingo" class="hover:underline">My Card</a>
      <span class="opacity-80">Hi, {data.user.name}</span>
      <button
        onclick={handleSignOut}
        class="rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 transition"
      >
        Sign out
      </button>
    {:else}
      <a
        href="/login"
        class="rounded-md bg-white text-blue-700 hover:bg-white/90 px-3 py-1.5 font-semibold transition"
      >
        Sign in
      </a>
    {/if}
  </nav>
</header>

<main class="px-6 py-8">
  {@render children()}
</main>

<script lang="ts">
  let { data } = $props();
</script>

<section class="mx-auto max-w-2xl text-center space-y-6 mt-12">
  <h1 class="text-5xl font-extrabold tracking-tight">HACKSU Bingo</h1>
  <p class="text-lg opacity-90">
    Complete challenges, attend events, and ship projects to fill out your card.
  </p>

  {#if data.user}
    <a
      href="/bingo"
      class="inline-block rounded-lg bg-white text-blue-700 font-bold px-6 py-3 hover:bg-white/90 transition"
    >
      Open my bingo card →
    </a>
  {:else}
    <a
      href="/login"
      class="inline-block rounded-lg bg-white text-blue-700 font-bold px-6 py-3 hover:bg-white/90 transition"
    >
      Sign in to play
    </a>
  {/if}
</section>

<script lang="ts">
  let { data } = $props();
</script>

<section class="mx-auto max-w-2xl text-center space-y-6 mt-12">
  <h1 class="text-5xl font-extrabold tracking-tight">HACKSU Bingo</h1>
  <p class="text-lg text-slate-300">
    Complete challenges, attend events, and ship projects to fill out your card.
  </p>

  {#if data.user}
    <a
      href="/bingo"
      class="inline-block rounded-lg bg-emerald-500 text-emerald-950 font-bold px-6 py-3 hover:bg-emerald-400 transition"
    >
      Open my bingo card
    </a>
  {:else}
    <a
      href="/login"
      class="inline-block rounded-lg bg-emerald-500 text-emerald-950 font-bold px-6 py-3 hover:bg-emerald-400 transition"
    >
      Sign in to play
    </a>
  {/if}
</section>

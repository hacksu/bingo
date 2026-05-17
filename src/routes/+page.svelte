<script lang="ts">
    import RobotGreen from '$lib/RobotGreen.svelte';
    import RobotBlue from '$lib/RobotBlue.svelte';

  let { data } = $props();
</script>

<div class="flex items-center justify-center gap-8 mt-12 py-8">
  <div class="hidden md:block" style="transform: rotate(-8deg);">
    <RobotGreen size="250px" animated />
  </div>

  <section class="mx-auto max-w-3xl text-center space-y-6">
    
    <h1 class="text-5xl font-extrabold tracking-tight">
      <img src="/hacksu_logo.svg" alt="HACKSU logo" class="h-60 w-auto inline-block mr-3 -mt-2" />
      <br />
      Semester
      Bingo
    </h1>
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

  <div class="hidden md:block" style="transform: rotate(8deg);">
    <RobotBlue size="250px" animated />
  </div>
</div>
<script lang="ts">
  import { signIn } from '$lib/auth-client';

  async function loginWith(provider: 'discord' | 'github') {
    await signIn.social({ provider, callbackURL: '/bingo' });
  }
</script>

<section class="mx-auto max-w-md mt-16 space-y-6 text-center">
  <h1 class="text-3xl font-extrabold">Sign in</h1>
  <p class="opacity-90">Use Discord or GitHub to track your bingo progress.</p>

  <div class="space-y-3">
    <button
      onclick={() => loginWith('discord')}
      class="w-full rounded-lg bg-[#5865F2] hover:bg-[#4752c4] px-5 py-3 font-semibold transition"
    >
      Continue with Discord
    </button>
    <button
      onclick={() => loginWith('github')}
      class="w-full rounded-lg bg-gray-900 hover:bg-black px-5 py-3 font-semibold transition"
    >
      Continue with GitHub
    </button>
  </div>
</section>

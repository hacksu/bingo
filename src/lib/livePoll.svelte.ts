// src/lib/livePoll.svelte.ts
import { invalidate } from '$app/navigation';

/**
 * Re-runs the load that called `depends(key)` on an interval, but only while the
 * browser tab is visible. Pauses on tab hide (battery/data on mobile) and fires one
 * immediate refresh when the tab becomes visible again.
 *
 * Call ONCE at component init (top of <script>); the $effect handles teardown.
 */
export function livePoll(key: string, intervalMs = 5000) {
  $effect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer === null) timer = setInterval(() => invalidate(key), intervalMs);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        invalidate(key); // immediate catch-up on return
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });
}

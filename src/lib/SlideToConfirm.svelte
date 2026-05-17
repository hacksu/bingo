<script lang="ts">
  type Props = {
    label?: string;
    confirmedLabel?: string;
    onconfirm: () => void;
    disabled?: boolean;
    variant?: 'confirm' | 'danger';
  };

  let {
    label = 'Slide to confirm',
    confirmedLabel = 'Confirmed',
    onconfirm,
    disabled = false,
    variant = 'confirm'
  }: Props = $props();

  const palette = $derived(
    variant === 'danger'
      ? {
          trackIdle: 'bg-rose-950/40 border-rose-400/40',
          trackDisabled: 'bg-rose-950/20 border-rose-400/20',
          trackDone: 'bg-rose-700/60 border-rose-300/40',
          fillIdle: 'bg-rose-600/70',
          fillDone: 'bg-rose-600',
          textIdle: 'text-rose-100',
          textDone: 'text-white',
          thumbIdle: 'bg-rose-500 text-white',
          thumbDisabled: 'bg-rose-700 text-rose-200',
          thumbDone: 'bg-rose-400 text-white'
        }
      : {
          trackIdle: 'bg-amber-950/40 border-amber-400/40',
          trackDisabled: 'bg-amber-950/20 border-amber-400/20',
          trackDone: 'bg-emerald-700/60 border-emerald-300/40',
          fillIdle: 'bg-amber-500/60',
          fillDone: 'bg-emerald-500/80',
          textIdle: 'text-amber-100',
          textDone: 'text-white',
          thumbIdle: 'bg-amber-400 text-amber-950',
          thumbDisabled: 'bg-amber-700 text-amber-200',
          thumbDone: 'bg-emerald-400 text-emerald-950'
        }
  );

  const THUMB = 56;
  const THRESHOLD = 0.97;

  let track: HTMLDivElement;
  let thumbX = $state(0);
  let dragging = $state(false);
  let confirmed = $state(false);

  function maxX(): number {
    return Math.max(0, (track?.clientWidth ?? 0) - THUMB);
  }

  function start(e: PointerEvent) {
    if (disabled || confirmed) return;
    dragging = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function move(e: PointerEvent) {
    if (!dragging) return;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left - THUMB / 2;
    thumbX = Math.max(0, Math.min(maxX(), x));
  }

  function end(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    finish();
  }

  function finish() {
    const m = maxX();
    if (m > 0 && thumbX / m >= THRESHOLD) {
      thumbX = m;
      confirmed = true;
      onconfirm();
    } else {
      thumbX = 0;
    }
  }

  function key(e: KeyboardEvent) {
    if (disabled || confirmed) return;
    const step = maxX() / 10;
    if (e.key === 'ArrowRight') {
      thumbX = Math.min(maxX(), thumbX + step);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      thumbX = Math.max(0, thumbX - step);
      e.preventDefault();
    } else if (e.key === 'End' || e.key === 'Enter' || e.key === ' ') {
      thumbX = maxX();
      finish();
      e.preventDefault();
    } else if (e.key === 'Home' || e.key === 'Escape') {
      thumbX = 0;
      e.preventDefault();
    }
  }
</script>

<div
  bind:this={track}
  class="relative h-14 w-full rounded-full overflow-hidden select-none border
         {confirmed ? palette.trackDone : disabled ? palette.trackDisabled : palette.trackIdle}"
>
  <div
    class="absolute inset-y-0 left-0 rounded-full transition-colors
           {confirmed ? palette.fillDone : palette.fillIdle}"
    style="width: {thumbX + THUMB}px;"
  ></div>
  <div
    class="absolute inset-0 flex items-center justify-center text-sm font-semibold tracking-wide pointer-events-none
           {confirmed ? palette.textDone : palette.textIdle}"
  >
    {confirmed ? confirmedLabel : label}
  </div>
  <button
    type="button"
    aria-label={label}
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={Math.round((thumbX / Math.max(1, maxX())) * 100)}
    role="slider"
    tabindex={disabled || confirmed ? -1 : 0}
    onpointerdown={start}
    onpointermove={move}
    onpointerup={end}
    onpointercancel={end}
    onkeydown={key}
    {disabled}
    class="absolute top-0 h-14 w-14 rounded-full shadow-lg
           flex items-center justify-center
           {confirmed
      ? palette.thumbDone + ' cursor-default'
      : disabled
        ? palette.thumbDisabled + ' cursor-not-allowed'
        : palette.thumbIdle + ' cursor-grab active:cursor-grabbing'}"
    style="transform: translateX({thumbX}px); transition: {dragging
      ? 'none'
      : 'transform 0.2s ease-out'};"
  >
    <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {#if confirmed}
        <polyline points="5 12 10 17 19 8" />
      {:else}
        <polyline points="9 6 15 12 9 18" />
      {/if}
    </svg>
  </button>
</div>

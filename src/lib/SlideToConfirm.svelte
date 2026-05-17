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
    confirmedLabel = '✓ Confirmed',
    onconfirm,
    disabled = false,
    variant = 'confirm'
  }: Props = $props();

  const palette = $derived(
    variant === 'danger'
      ? {
          trackIdle: 'bg-red-200',
          trackDisabled: 'bg-red-200/60',
          trackDone: 'bg-red-300',
          fillIdle: 'bg-red-300',
          fillDone: 'bg-red-400',
          textIdle: 'text-red-950/80',
          textDone: 'text-red-950',
          thumbIdle: 'bg-red-600 text-white',
          thumbDisabled: 'bg-red-300 text-red-900',
          thumbDone: 'bg-red-700 text-white'
        }
      : {
          trackIdle: 'bg-yellow-200',
          trackDisabled: 'bg-yellow-200/60',
          trackDone: 'bg-emerald-300',
          fillIdle: 'bg-yellow-300',
          fillDone: 'bg-emerald-400',
          textIdle: 'text-yellow-950/80',
          textDone: 'text-emerald-950',
          thumbIdle: 'bg-emerald-500 text-white',
          thumbDisabled: 'bg-yellow-300 text-yellow-900',
          thumbDone: 'bg-emerald-500 text-white'
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

  // Keyboard accessibility: focus the thumb, arrow keys / End to confirm.
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
  class="relative h-14 w-full rounded-full overflow-hidden select-none
         {confirmed ? palette.trackDone : disabled ? palette.trackDisabled : palette.trackIdle}"
>
  <div
    class="absolute inset-y-0 left-0 rounded-full transition-colors
           {confirmed ? palette.fillDone : palette.fillIdle}"
    style="width: {thumbX + THUMB}px;"
  ></div>
  <div
    class="absolute inset-0 flex items-center justify-center font-extrabold pointer-events-none
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
    class="absolute top-0 h-14 w-14 rounded-full shadow-lg border-2 border-white/40
           flex items-center justify-center text-xl font-black
           {confirmed
      ? palette.thumbDone + ' cursor-default'
      : disabled
        ? palette.thumbDisabled + ' cursor-not-allowed'
        : palette.thumbIdle + ' cursor-grab active:cursor-grabbing'}"
    style="transform: translateX({thumbX}px); transition: {dragging
      ? 'none'
      : 'transform 0.2s ease-out'};"
  >
    {confirmed ? '✓' : '→'}
  </button>
</div>

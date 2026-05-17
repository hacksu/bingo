<script lang="ts">
  export let size: string = '120px';
  export let alt: string = 'Blue robot mascot';
  export let animated: boolean = false;
  export let className: string = '';
</script>

<div class="robot robot-blue {animated ? 'animated' : ''} {className}" style="--robot-size: {size}">
  <img src="/robot-blue.svg" {alt} />
</div>

<style>
  .robot {
    display: inline-block;
    width: var(--robot-size);
    height: auto;
  }

  .robot img {
    width: 100%;
    height: auto;
    display: block;
  }

  .robot.animated {
    animation: bounce 2s infinite;
  }

  @keyframes bounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }
</style>

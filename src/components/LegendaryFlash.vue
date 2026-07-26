<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * The 5★ moment. Fires once per summon that lands at least one legendary asset, then removes
 * itself. Overlay only — it never blocks input, and it collapses to a brief static banner when
 * the viewer prefers reduced motion.
 */
const props = defineProps<{ names: string[] }>()
const emit = defineEmits<{ done: [] }>()

const reducedMotion =
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

const DURATION = reducedMotion ? 1400 : 2100
const leaving = ref(false)
let hide: ReturnType<typeof setTimeout> | undefined
let done: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  hide = setTimeout(() => (leaving.value = true), DURATION - 400)
  done = setTimeout(() => emit('done'), DURATION)
})

onBeforeUnmount(() => {
  clearTimeout(hide)
  clearTimeout(done)
})
</script>

<template>
  <div class="flash" :class="{ leaving, still: reducedMotion }" role="status" aria-live="polite">
    <div class="scrim" aria-hidden="true"></div>
    <div class="burst" aria-hidden="true"></div>
    <div class="rays" aria-hidden="true"></div>
    <div class="bars" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>

    <div class="plate">
      <div class="stars" aria-hidden="true">★★★★★</div>
      <div class="headline">Legendary</div>
      <div class="names">{{ props.names.join(' · ') }}</div>
      <div class="fineprint label">Drawn at even odds · {{ props.names.length }} legendary asset{{ props.names.length > 1 ? 's' : '' }}</div>
    </div>
  </div>
</template>

<style scoped>
.flash {
  position: fixed;
  inset: 0;
  z-index: 60;
  pointer-events: none;
  display: grid;
  place-items: center;
  transition: opacity 0.4s ease-out;
}

.flash.leaving {
  opacity: 0;
}

/* Dims the stage so the plate reads cleanly instead of colliding with the cards behind it. */
.scrim {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, rgba(3, 5, 10, 0.86) 30%, rgba(3, 5, 10, 0.94) 100%);
  animation: fade-in 0.35s ease-out both;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

.burst {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 50% 50%,
    color-mix(in srgb, var(--r5) 42%, transparent) 0%,
    color-mix(in srgb, var(--r5) 14%, transparent) 26%,
    transparent 62%
  );
  animation: burst 0.9s cubic-bezier(0.15, 0.85, 0.25, 1) both;
}

@keyframes burst {
  0% {
    opacity: 0;
    transform: scale(0.25);
  }
  35% {
    opacity: 1;
  }
  100% {
    opacity: 0.35;
    transform: scale(1.6);
  }
}

/* Rotating spokes behind the plate. */
.rays {
  position: absolute;
  width: 150vmax;
  height: 150vmax;
  background: repeating-conic-gradient(
    from 0deg,
    color-mix(in srgb, var(--r5) 20%, transparent) 0deg 4deg,
    transparent 4deg 14deg
  );
  mask-image: radial-gradient(circle, #000 8%, transparent 55%);
  animation: spin 7s linear both;
  opacity: 0.75;
}

@keyframes spin {
  from {
    transform: rotate(0deg) scale(0.6);
    opacity: 0;
  }
  25% {
    opacity: 0.75;
  }
  to {
    transform: rotate(70deg) scale(1);
    opacity: 0.4;
  }
}

/* Three shutter bars that snap open across the screen. */
.bars {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: center;
  gap: 0.6rem;
}

.bars span {
  display: block;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--r5), transparent);
  transform: scaleX(0);
  animation: wipe 0.85s cubic-bezier(0.2, 0.9, 0.2, 1) both;
}

.bars span:nth-child(2) {
  height: 5px;
  animation-delay: 0.06s;
}

.bars span:nth-child(3) {
  animation-delay: 0.12s;
}

@keyframes wipe {
  40% {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(1);
    opacity: 0;
  }
}

.plate {
  position: relative;
  text-align: center;
  padding: var(--sp-5) var(--sp-6);
  animation: land 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes land {
  from {
    opacity: 0;
    transform: scale(1.35);
    filter: blur(6px);
  }
}

.stars {
  font-family: var(--mono);
  font-size: 1.1rem;
  letter-spacing: 0.5em;
  color: var(--r5);
  text-shadow: 0 0 24px color-mix(in srgb, var(--r5) 80%, transparent);
}

.headline {
  font-family: var(--display);
  font-weight: 700;
  font-size: clamp(2rem, 8vw, 4.2rem);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #fff5d6;
  text-shadow:
    0 0 12px color-mix(in srgb, var(--r5) 90%, transparent),
    0 0 48px color-mix(in srgb, var(--r5) 70%, transparent);
  margin: 0.4rem 0 0.2rem;
  animation: glitch 0.5s steps(2, end) 3 both;
}

@keyframes glitch {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }
  20% {
    transform: translate3d(-2px, 1px, 0);
  }
  40% {
    transform: translate3d(2px, -1px, 0);
  }
}

.names {
  font-family: var(--ui);
  font-size: clamp(1rem, 2.6vw, 1.5rem);
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text);
  overflow-wrap: anywhere;
  /* Lifts the name off whatever card text happens to sit behind it. */
  text-shadow:
    0 0 8px rgba(3, 5, 10, 0.95),
    0 2px 20px rgba(3, 5, 10, 0.9);
}

.fineprint {
  margin-top: 0.6rem;
  color: color-mix(in srgb, var(--r5) 70%, var(--text-dim));
}

/* Reduced motion: no spin, no burst, no glitch — just the plate, briefly. */
.flash.still .burst,
.flash.still .rays,
.flash.still .bars {
  display: none;
}

.flash.still .scrim {
  animation: none;
}

.flash.still .plate {
  background: rgba(5, 7, 13, 0.9);
  border: 1px solid var(--r5);
}

@media (prefers-reduced-motion: reduce) {
  .plate,
  .headline,
  .burst,
  .rays,
  .bars span {
    animation: none !important;
  }
}
</style>

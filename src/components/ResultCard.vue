<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Unit } from '../types'

/**
 * Compact draw result. Five of these fit across a laptop screen without scrolling; the full
 * stat block is one click away rather than always on screen.
 */
const props = withDefaults(
  defineProps<{
    unit: Unit
    roll: number
    poolSize: number
    index?: number
  }>(),
  { index: 0 },
)

defineEmits<{ open: [] }>()

const imageFailed = ref(false)
const monogram = computed(() => props.unit.name.trim().charAt(0).toUpperCase() || '?')
</script>

<template>
  <button
    class="result panel"
    type="button"
    :data-rarity="unit.rarity"
    :style="{ '--delay': `${Math.min(index, 8) * 90}ms` }"
    :aria-label="`${unit.name}, ${unit.rarity} star. Open full stat block.`"
    @click="$emit('open')"
  >
    <span class="art">
      <img
        v-if="unit.imageUrl && !imageFailed"
        :src="unit.imageUrl"
        alt=""
        loading="lazy"
        referrerpolicy="no-referrer"
        @error="imageFailed = true"
      />
      <span v-else class="monogram" aria-hidden="true">{{ monogram }}</span>
      <span class="roll mono">{{ roll }}<small>/{{ poolSize }}</small></span>
    </span>

    <span class="body">
      <span class="stars" :class="`r${unit.rarity}`">{{ '★'.repeat(unit.rarity) }}</span>
      <span class="name">{{ unit.name }}</span>
      <span class="sponsor label">{{ unit.game }}</span>
    </span>

    <span class="stats mono">
      <span><small>HP</small>{{ unit.hp || '—' }}</span>
      <span><small>AC</small>{{ unit.ac || '—' }}</span>
      <span><small>ATK</small>+{{ unit.attackBonus || '0' }}</span>
    </span>

    <span class="more label">View stat block</span>
  </button>
</template>

<style scoped>
.result {
  --rarity: var(--r3);
  display: flex;
  flex-direction: column;
  padding: 0;
  text-align: left;
  color: inherit;
  cursor: pointer;
  overflow: hidden;
  border-color: color-mix(in srgb, var(--rarity) 40%, var(--line));
  animation: rise 0.45s cubic-bezier(0.2, 0.8, 0.3, 1) both;
  animation-delay: var(--delay, 0ms);
  transition:
    transform 0.15s,
    border-color 0.15s;
}

.result:hover {
  transform: translateY(-3px);
  border-color: var(--rarity);
}

.result[data-rarity='4'] {
  --rarity: var(--r4);
}

.result[data-rarity='5'] {
  --rarity: var(--r5);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--r5) 35%, transparent),
    0 0 44px -12px color-mix(in srgb, var(--r5) 80%, transparent);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.97);
  }
}

.art {
  position: relative;
  display: grid;
  place-items: center;
  height: 7.5rem;
  background: var(--bg-raised);
  border-bottom: 1px solid color-mix(in srgb, var(--rarity) 30%, var(--line));
  overflow: hidden;
}

.art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}

/* A single light sweep across legendary art, once, as it lands. */
.result[data-rarity='5'] .art::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    100deg,
    transparent 35%,
    color-mix(in srgb, var(--r5) 55%, transparent) 50%,
    transparent 65%
  );
  transform: translateX(-120%);
  animation: sheen 1.1s ease-out 0.35s both;
}

@keyframes sheen {
  to {
    transform: translateX(120%);
  }
}

.monogram {
  font-family: var(--display);
  font-size: 2.2rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--rarity) 70%, var(--text-faint));
}

.roll {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--cyan);
  background: rgba(5, 7, 13, 0.82);
  border-left: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  padding: 0.15rem 0.4rem;
  line-height: 1.2;
}

.roll small {
  font-size: 0.6rem;
  color: var(--text-faint);
}

.body {
  display: grid;
  gap: 0.15rem;
  padding: var(--sp-3);
  align-content: start;
}

.stars {
  color: var(--rarity);
  font-size: 0.72rem;
  font-family: var(--mono);
  letter-spacing: 0.1em;
}

.name {
  font-weight: 600;
  font-size: 0.92rem;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.sponsor {
  color: var(--magenta);
  letter-spacing: 0.08em;
  overflow-wrap: anywhere;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid var(--line);
  margin-top: auto;
}

.stats > span {
  padding: 0.4rem 0.3rem;
  text-align: center;
  font-size: 0.85rem;
  border-right: 1px solid var(--line);
}

.stats > span:last-child {
  border-right: 0;
}

.stats small {
  display: block;
  font-size: 0.5rem;
  letter-spacing: 0.18em;
  color: var(--text-faint);
}

.more {
  border-top: 1px solid var(--line);
  padding: 0.4rem;
  text-align: center;
  color: var(--text-faint);
  font-size: 0.55rem;
}

.result:hover .more {
  color: var(--cyan);
}
</style>

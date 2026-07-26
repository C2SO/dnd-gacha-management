<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Unit } from '../types'
import { ABILITIES } from '../types'
import { abilityBlocks, attackProfile, damageLine, monogramFor } from '../utils/unitPresentation'

/**
 * Full sheet for one asset, sized so the portrait actually reads: art gets its own column at
 * laptop width and sits above the stats on narrow screens. Shared by the summon stage and the
 * codex so both open the same thing.
 */
const props = withDefaults(
  defineProps<{
    unit: Unit
    roll?: number | null
    poolSize?: number | null
    claimedBy?: string | null
  }>(),
  { roll: null, poolSize: null, claimedBy: null },
)

const emit = defineEmits<{ close: [] }>()

const imageFailed = ref(false)
// Portraits are hotlinked, so they can be slow as well as broken. The monogram sits underneath
// and is covered only once an image has actually decoded — the frame is never blank.
const imageLoaded = ref(false)
const closeButton = ref<HTMLButtonElement | null>(null)

watch(
  () => props.unit.imageUrl,
  () => {
    imageFailed.value = false
    imageLoaded.value = false
  },
)

const monogram = computed(() => monogramFor(props.unit))
const profile = computed(() => attackProfile(props.unit))
const damage = computed(() => damageLine(props.unit))
const blocks = computed(() => abilityBlocks(props.unit))
const proficient = computed(() => new Set(props.unit.saveProficient))

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  // Move focus into the dialog so Escape and Tab behave for keyboard users.
  closeButton.value?.focus()
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <div
      class="modal panel"
      :data-rarity="unit.rarity"
      role="dialog"
      aria-modal="true"
      :aria-label="unit.name"
    >
      <header class="bar">
        <div class="ident">
          <h2 class="name">{{ unit.name }}</h2>
          <div class="stars" :class="`r${unit.rarity}`">{{ '★'.repeat(unit.rarity) }}</div>
          <div class="meta label">{{ unit.role }} · Slot {{ unit.bannerId }}</div>
        </div>

        <div v-if="roll !== null" class="roll mono">
          <span class="roll-value">{{ roll }}</span>
          <span class="label">{{ poolSize ? `of ${poolSize}` : 'roll' }}</span>
        </div>

        <button ref="closeButton" class="close btn btn-sm" type="button" @click="emit('close')">
          Close
        </button>
      </header>

      <div class="body">
        <figure class="art">
          <div class="frame">
            <span v-if="!imageLoaded" class="monogram" aria-hidden="true">{{ monogram }}</span>
            <img
              v-if="unit.imageUrl && !imageFailed"
              :src="unit.imageUrl"
              :alt="`${unit.name} portrait`"
              referrerpolicy="no-referrer"
              @load="imageLoaded = true"
              @error="imageFailed = true"
            />
          </div>
          <figcaption>
            <span class="sponsor label">Sponsored by {{ unit.game }}</span>
            <span v-if="claimedBy" class="claim label">Claimed by {{ claimedBy }}</span>
            <span v-if="unit.retired" class="claim label">Retired — out of the draw pool</span>
          </figcaption>
        </figure>

        <div class="data">
          <div class="stats">
            <div class="stat">
              <div class="label">HP</div>
              <div class="value mono">{{ unit.hp || '—' }}</div>
              <div class="sub mono">{{ unit.hpFormula || '—' }}</div>
            </div>
            <div class="stat">
              <div class="label">AC</div>
              <div class="value mono">{{ unit.ac || '—' }}</div>
              <div class="sub mono">Speed {{ unit.speed || '—' }}</div>
            </div>
            <div class="stat">
              <div class="label">Attack</div>
              <div class="value mono">+{{ unit.attackBonus || '0' }}</div>
              <div class="sub mono">{{ damage || '—' }}</div>
            </div>
          </div>

          <div class="saves">
            <div class="label">Saving throws</div>
            <div class="save-row">
              <div
                v-for="ability in ABILITIES"
                :key="ability"
                class="save"
                :class="{ prof: proficient.has(ability) }"
              >
                <span class="save-key">{{ ability }}</span>
                <span class="save-val mono">{{ unit.saveMods[ability] || '—' }}</span>
              </div>
            </div>
            <div v-if="unit.saves" class="sub mono">{{ unit.saves }}</div>
          </div>

          <div v-if="profile" class="profile mono">{{ profile }}</div>

          <section v-for="block in blocks" :key="block.label + block.head" :class="{ feature: block.feature }">
            <div class="label block-label">{{ block.label }}</div>
            <p>
              <strong v-if="block.head">{{ block.head }}.</strong>
              {{ block.body }}
            </p>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(3, 5, 10, 0.86);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: var(--sp-4);
}

.modal {
  --rarity: var(--r3);
  width: min(58rem, 100%);
  max-height: min(90vh, 52rem);
  display: flex;
  flex-direction: column;
  border-color: color-mix(in srgb, var(--rarity) 45%, var(--line));
  animation: pop 0.28s cubic-bezier(0.2, 0.9, 0.3, 1) both;
}

.modal[data-rarity='4'] {
  --rarity: var(--r4);
}

.modal[data-rarity='5'] {
  --rarity: var(--r5);
  box-shadow: 0 0 60px -18px color-mix(in srgb, var(--r5) 85%, transparent);
}

@keyframes pop {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
  }
}

.bar {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-4);
  padding: var(--sp-4);
  border-bottom: 1px solid var(--line);
  background: linear-gradient(120deg, color-mix(in srgb, var(--rarity) 12%, transparent), transparent 60%);
  flex: none;
}

.ident {
  flex: 1;
  min-width: 0;
}

.name {
  font-family: var(--display);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.modal[data-rarity='5'] .name {
  text-shadow: 0 0 22px color-mix(in srgb, var(--r5) 55%, transparent);
}

.stars {
  color: var(--rarity);
  font-family: var(--mono);
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  margin-top: 0.25rem;
}

.meta {
  margin-top: 0.3rem;
  letter-spacing: 0.12em;
}

.roll {
  text-align: right;
  line-height: 1;
  flex: none;
}

.roll-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--cyan);
}

.close {
  flex: none;
}

/* The scrolling region — the header stays put. */
.body {
  display: grid;
  grid-template-columns: 20rem 1fr;
  gap: var(--sp-5);
  padding: var(--sp-4);
  overflow-y: auto;
}

.art {
  margin: 0;
  display: grid;
  gap: var(--sp-3);
  align-content: start;
}

/*
 * Portraits come from several different wikis at wildly different aspect ratios — full-body
 * splash art next to square profile icons. `contain` shows all of every one rather than
 * cropping heads off, and the frame keeps the column a consistent size either way.
 */
.frame {
  display: grid;
  /* Definite track sizes: without these the row sizes to the image and a tall portrait's
     `max-height: 100%` has nothing to resolve against, so it overflows and gets clipped. */
  grid-template-rows: minmax(0, 1fr);
  grid-template-columns: minmax(0, 1fr);
  place-items: center;
  aspect-ratio: 3 / 4;
  background:
    radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--rarity) 16%, transparent), transparent 70%),
    var(--bg-raised);
  border: 1px solid color-mix(in srgb, var(--rarity) 45%, var(--line));
  overflow: hidden;
}

/* Both children share one grid cell so the art simply covers the monogram. */
.frame > * {
  grid-area: 1 / 1;
}

/*
 * Constrained by max-* rather than width/height:100%. The frame centers its children rather
 * than stretching them, so a percentage height would resolve against the content and let a
 * tall portrait overflow and get clipped. This fits every aspect ratio inside the box.
 */
.frame img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

.monogram {
  font-family: var(--display);
  font-size: 5rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--rarity) 70%, var(--text-faint));
}

figcaption {
  display: grid;
  gap: 0.3rem;
}

.sponsor {
  color: var(--magenta);
  letter-spacing: 0.1em;
}

.claim {
  color: var(--text-dim);
}

.data {
  display: grid;
  gap: var(--sp-4);
  align-content: start;
  min-width: 0;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid var(--line);
}

.stat {
  padding: var(--sp-3);
  border-right: 1px solid var(--line);
}

.stat:last-child {
  border-right: 0;
}

.value {
  font-size: 1.5rem;
  font-weight: 500;
  margin-top: 0.2rem;
}

.stat:first-child .value {
  color: var(--cyan);
}

.sub {
  font-size: 0.65rem;
  color: var(--text-faint);
  letter-spacing: 0.06em;
  margin-top: 0.2rem;
  overflow-wrap: anywhere;
}

.save-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
  margin-top: 0.4rem;
}

.save {
  background: var(--bg-raised);
  padding: 0.4rem 0.2rem;
  text-align: center;
}

.save-key {
  display: block;
  font-family: var(--mono);
  font-size: 0.58rem;
  letter-spacing: 0.14em;
  color: var(--text-faint);
}

.save-val {
  display: block;
  font-size: 0.85rem;
  margin-top: 0.1rem;
}

.save.prof {
  background: color-mix(in srgb, var(--cyan) 14%, var(--bg-raised));
}

.save.prof .save-key,
.save.prof .save-val {
  color: var(--cyan);
}

.profile {
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-dim);
  padding: 0.55rem var(--sp-3);
  background: var(--bg-raised);
  border-left: 2px solid var(--line-bright);
}

.data p {
  font-size: 0.95rem;
  line-height: 1.6;
}

.data strong {
  font-weight: 600;
}

.block-label {
  margin-bottom: 0.3rem;
  color: var(--cyan-deep);
}

.feature {
  border-left: 2px solid var(--rarity);
  padding-left: var(--sp-3);
}

.feature .block-label {
  color: var(--rarity);
}

@media (max-width: 46rem) {
  .body {
    grid-template-columns: 1fr;
    gap: var(--sp-4);
  }
  .frame {
    aspect-ratio: 4 / 3;
    max-height: 40vh;
  }
  .name {
    font-size: 1.05rem;
  }
}
</style>

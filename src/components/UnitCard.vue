<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Unit } from '../types'
import { ABILITIES } from '../types'

const props = withDefaults(
  defineProps<{
    unit: Unit
    /** Die face that produced this card, when shown as a draw result. */
    roll?: number | null
    /** Faces on that die, i.e. how many assets were in the pool. */
    poolSize?: number | null
    claimedBy?: string | null
    /** Stagger index for the reveal animation. */
    index?: number
  }>(),
  { roll: null, poolSize: null, claimedBy: null, index: 0 },
)

const imageFailed = ref(false)
watch(
  () => props.unit.imageUrl,
  () => {
    imageFailed.value = false
  },
)

const monogram = computed(() => props.unit.name.trim().charAt(0).toUpperCase() || '?')

/** Compact mechanical line assembled from the decomposed CSV columns. */
const profile = computed(() =>
  [props.unit.attackKind, props.unit.attackAbility, props.unit.attackRange, props.unit.attackTargets]
    .filter(Boolean)
    .join(' · '),
)

const damageLine = computed(() => {
  const parts: string[] = []
  if (props.unit.damage) parts.push([props.unit.damage, props.unit.damageType].filter(Boolean).join(' '))
  if (props.unit.bonusDamage) {
    parts.push(`+ ${[props.unit.bonusDamage, props.unit.bonusDamageType].filter(Boolean).join(' ')}`)
  }
  return parts.join(' ')
})

/** Splits "Name (Recharge 5-6): text" so the ability name can be emphasised. */
function splitAbility(text: string): { head: string; body: string } {
  const match = /^([^:]{2,90}?):\s*([\s\S]+)$/.exec(text.trim())
  return match ? { head: match[1].trim(), body: match[2].trim() } : { head: '', body: text.trim() }
}

const blocks = computed(() => {
  const out: { label: string; head: string; body: string; feature?: boolean }[] = []
  const u = props.unit

  if (u.attack) out.push({ label: 'Attack', ...splitAbility(u.attack) })
  if (u.baselineText) out.push({ label: u.baselineName || 'Baseline', head: '', body: u.baselineText })
  if (u.healing) out.push({ label: 'Healing', ...splitAbility(u.healing) })
  if (u.special) out.push({ label: 'Special', ...splitAbility(u.special) })
  if (u.capstoneText) {
    out.push({ label: u.capstoneType || 'Capstone', ...splitAbility(u.capstoneText), feature: true })
  }
  return out
})

const proficient = computed(() => new Set(props.unit.saveProficient))
</script>

<template>
  <article
    class="unit panel"
    :data-rarity="unit.rarity"
    :class="{ retired: unit.retired }"
    :style="{ '--delay': `${Math.min(index, 8) * 70}ms` }"
  >
    <header class="head">
      <div class="portrait">
        <img
          v-if="unit.imageUrl && !imageFailed"
          :src="unit.imageUrl"
          :alt="`${unit.name} portrait`"
          loading="lazy"
          referrerpolicy="no-referrer"
          @error="imageFailed = true"
        />
        <span v-else class="monogram" aria-hidden="true">{{ monogram }}</span>
      </div>

      <div class="ident">
        <h3 class="name">{{ unit.name }}</h3>
        <div class="stars" :class="`r${unit.rarity}`">{{ '★'.repeat(unit.rarity) }}</div>
        <div class="meta label">{{ unit.role }} · Slot {{ unit.bannerId }}</div>
        <div class="sponsor label">Sponsored by {{ unit.game }}</div>
      </div>

      <div v-if="roll !== null" class="roll mono">
        <span class="roll-value">{{ roll }}</span>
        <span class="label">{{ poolSize ? `d${poolSize}` : 'roll' }}</span>
      </div>
    </header>

    <p v-if="claimedBy" class="claim label">Claimed by {{ claimedBy }}</p>
    <p v-if="unit.retired" class="claim label">Retired — no longer in the draw pool</p>

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
        <div class="sub mono">{{ damageLine || '—' }}</div>
      </div>
    </div>

    <div class="saves">
      <div class="label saves-label">Saves</div>
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
      <div v-if="unit.saves" class="sub mono saves-summary">{{ unit.saves }}</div>
    </div>

    <div v-if="profile" class="profile mono">{{ profile }}</div>

    <div class="body">
      <section v-for="block in blocks" :key="block.label + block.head" :class="{ feature: block.feature }">
        <div class="label block-label">{{ block.label }}</div>
        <p>
          <strong v-if="block.head">{{ block.head }}.</strong>
          {{ block.body }}
        </p>
      </section>
    </div>
  </article>
</template>

<style scoped>
.unit {
  --rarity: var(--r3);
  display: flex;
  flex-direction: column;
  animation: rise 0.45s cubic-bezier(0.2, 0.8, 0.3, 1) both;
  animation-delay: var(--delay, 0ms);
  border-color: color-mix(in srgb, var(--rarity) 35%, var(--line));
}

.unit[data-rarity='4'] {
  --rarity: var(--r4);
}

.unit[data-rarity='5'] {
  --rarity: var(--r5);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--r5) 30%, transparent),
    0 0 46px -14px color-mix(in srgb, var(--r5) 75%, transparent);
}

.unit.retired {
  opacity: 0.72;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
}

.head {
  display: flex;
  gap: var(--sp-3);
  align-items: flex-start;
  padding: var(--sp-4);
  border-bottom: 1px solid var(--line);
  background: linear-gradient(120deg, color-mix(in srgb, var(--rarity) 10%, transparent), transparent 62%);
}

.portrait {
  width: 68px;
  height: 68px;
  flex: 0 0 68px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: var(--bg-raised);
  border: 1px solid color-mix(in srgb, var(--rarity) 45%, var(--line));
}

.portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.monogram {
  font-family: var(--display);
  font-size: 1.7rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--rarity) 75%, var(--text-faint));
}

.ident {
  min-width: 0;
  flex: 1;
}

.name {
  font-family: var(--display);
  font-size: 1.02rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.unit[data-rarity='5'] .name {
  text-shadow: 0 0 20px color-mix(in srgb, var(--r5) 55%, transparent);
}

.stars {
  color: var(--rarity);
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.meta {
  margin-top: 0.3rem;
  letter-spacing: 0.12em;
}

.sponsor {
  margin-top: 0.25rem;
  letter-spacing: 0.1em;
  color: var(--magenta);
}

.roll {
  text-align: right;
  line-height: 1;
}

.roll-value {
  display: block;
  font-size: 1.6rem;
  font-weight: 500;
  color: var(--cyan);
}

.claim {
  margin: 0;
  padding: 0.5rem var(--sp-4);
  border-bottom: 1px solid var(--line);
  color: var(--text-dim);
  letter-spacing: 0.12em;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 1px solid var(--line);
}

.stat {
  padding: var(--sp-3) var(--sp-4);
  border-right: 1px solid var(--line);
}

.stat:last-child {
  border-right: 0;
}

.value {
  font-size: 1.25rem;
  font-weight: 500;
  margin-top: 0.2rem;
}

.stat:first-child .value {
  color: var(--cyan);
}

.sub {
  font-size: 0.62rem;
  color: var(--text-faint);
  letter-spacing: 0.06em;
  margin-top: 0.15rem;
  overflow-wrap: anywhere;
}

.saves {
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid var(--line);
}

.saves-label {
  margin-bottom: 0.45rem;
}

.save-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
}

.save {
  background: var(--bg-raised);
  padding: 0.35rem 0.2rem;
  text-align: center;
}

.save-key {
  display: block;
  font-family: var(--mono);
  font-size: 0.55rem;
  letter-spacing: 0.14em;
  color: var(--text-faint);
}

.save-val {
  display: block;
  font-size: 0.78rem;
  margin-top: 0.1rem;
}

.save.prof {
  background: color-mix(in srgb, var(--cyan) 12%, var(--bg-raised));
}

.save.prof .save-key,
.save.prof .save-val {
  color: var(--cyan);
}

.saves-summary {
  margin-top: 0.4rem;
}

.profile {
  font-size: 0.64rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-dim);
  padding: 0.55rem var(--sp-4);
  border-bottom: 1px solid var(--line);
  background: var(--bg-raised);
}

.body {
  padding: var(--sp-4);
  display: grid;
  gap: var(--sp-3);
}

.body p {
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--text);
}

.body strong {
  font-weight: 600;
  color: var(--text);
}

.block-label {
  margin-bottom: 0.3rem;
  color: var(--cyan-deep);
}

.feature .block-label {
  color: var(--rarity);
}

.feature {
  border-left: 2px solid var(--rarity);
  padding-left: var(--sp-3);
}
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import UnitCard from './UnitCard.vue'
import ResultCard from './ResultCard.vue'
import LegendaryFlash from './LegendaryFlash.vue'
import UnitDetailModal from './UnitDetailModal.vue'
import { useSession } from '../composables/useSession'
import { MAX_PULLS, type DrawResult } from '../utils/drawEngine'

const session = useSession()
const { state } = session

const playerId = ref(state.players[0]?.id ?? '')
const bannerId = ref(session.banners.value[0]?.id ?? 1)
const pullCount = ref(1)
const results = ref<DrawResult[]>([])
const notes = ref<string[]>([])
/** Compact by default so a full batch fits on a laptop screen without scrolling. */
const detailed = ref(false)
const expanded = ref<DrawResult | null>(null)
const flash = ref<{ key: number; names: string[] } | null>(null)

// Keep the selects pointing at something real after an import or a roster edit.
watch(
  () => state.players.map((p) => p.id).join(),
  () => {
    if (!state.players.some((p) => p.id === playerId.value)) playerId.value = state.players[0]?.id ?? ''
  },
  { immediate: true },
)
watch(
  () => session.banners.value.map((b) => b.id).join(),
  () => {
    if (!session.banners.value.some((b) => b.id === bannerId.value)) {
      bannerId.value = session.banners.value[0]?.id ?? 1
    }
  },
  { immediate: true },
)

const banner = computed(() => session.banners.value.find((b) => b.id === bannerId.value))
const stock = computed(() => session.stockFor(bannerId.value))
const remaining = computed(() => session.remainingOn(bannerId.value))
const player = computed(() => state.players.find((p) => p.id === playerId.value))

/** Every asset is equally likely, so the chance of any one of them is simply 1/pool. */
const perAssetOdds = computed(() =>
  remaining.value ? `1 in ${remaining.value} · ${(100 / remaining.value).toFixed(1)}% each` : '—',
)

const canSummon = computed(() => !!player.value && !!banner.value && remaining.value > 0)

const tally = computed(() => {
  const counts: Record<number, number> = { 3: 0, 4: 0, 5: 0 }
  for (const r of results.value) counts[r.unit.rarity]++
  return counts
})

function summon() {
  if (!canSummon.value) return

  const outcome = session.summon(playerId.value, bannerId.value, pullCount.value)
  results.value = outcome.results
  notes.value = []
  expanded.value = null

  const legendaries = outcome.results.filter((r) => r.unit.rarity === 5)
  if (legendaries.length) {
    flash.value = { key: Date.now(), names: legendaries.map((r) => r.unit.name) }
  }

  if (outcome.exhausted) {
    notes.value.push(
      outcome.results.length
        ? `Slot ran dry after ${outcome.results.length} of ${pullCount.value} draws.`
        : 'That slot is sold out — nothing left to summon.',
    )
  }
}
</script>

<template>
  <section>
    <header class="head">
      <h2 class="section-title">Sponsor draw</h2>
      <p class="section-sub">
        One die, one face per asset left in the slot. Every asset is exactly as likely as any
        other — a 5★ is no rarer to draw than a 3★. Anything drawn leaves the slot for the whole
        arena; no asset is ever sponsored twice.
      </p>
    </header>

    <div class="deck">
      <aside class="console panel">
        <div class="field">
          <label class="label" for="who">Contender</label>
          <select id="who" v-model="playerId">
            <option v-for="p in state.players" :key="p.id" :value="p.id">
              {{ p.name }}{{ p.className ? ` — ${p.className}` : '' }}
            </option>
          </select>
        </div>

        <div class="field">
          <label class="label" for="banner">Broadcast slot</label>
          <select id="banner" v-model.number="bannerId">
            <option v-for="b in session.banners.value" :key="b.id" :value="b.id">
              {{ b.id }} · {{ b.name }}
            </option>
          </select>
        </div>

        <div class="field">
          <span class="label">Draws</span>
          <div class="stepper" role="group" aria-label="Number of draws">
            <button
              v-for="n in MAX_PULLS"
              :key="n"
              type="button"
              class="step"
              :class="{ on: pullCount === n }"
              :aria-pressed="pullCount === n"
              @click="pullCount = n"
            >
              {{ n }}
            </button>
          </div>
        </div>

        <button class="btn btn-primary summon" type="button" :disabled="!canSummon" @click="summon">
          Summon ×{{ pullCount }}
        </button>

        <div class="stockbox">
          <div class="odds label">Even odds · {{ perAssetOdds }}</div>
          <div class="stock-row mono">
            <span class="r3">{{ stock[3] }}×3★</span>
            <span class="r4">{{ stock[4] }}×4★</span>
            <span class="r5">{{ stock[5] }}×5★</span>
          </div>
          <div class="label total">{{ remaining }} assets left in this slot</div>
        </div>
      </aside>

      <div class="stage">
        <div v-if="results.length || notes.length" class="readout panel">
          <div class="rolls mono">
            <span v-for="(r, i) in results" :key="i" class="roll" :class="`r${r.unit.rarity}`">
              {{ r.roll }}<small>d{{ r.poolSize }}</small>
            </span>
          </div>
          <div class="verdict">
            <span v-if="results.length" class="mono">
              {{ tally[5] }}×5★ · {{ tally[4] }}×4★ · {{ tally[3] }}×3★
            </span>
            <span v-if="player" class="label who">for {{ player.name }}</span>
            <button v-if="results.length" class="btn btn-sm toggle" type="button" @click="detailed = !detailed">
              {{ detailed ? 'Compact' : 'Full stat blocks' }}
            </button>
          </div>
          <ul v-if="notes.length" class="notes label">
            <li v-for="(note, i) in notes" :key="i">{{ note }}</li>
          </ul>
        </div>

        <div v-if="results.length" class="cards" :class="detailed ? 'full' : 'compact'">
          <template v-if="detailed">
            <UnitCard
              v-for="(r, i) in results"
              :key="`${r.unit.id}-${i}`"
              :unit="r.unit"
              :roll="r.roll"
              :pool-size="r.poolSize"
              :index="i"
            />
          </template>
          <template v-else>
            <ResultCard
              v-for="(r, i) in results"
              :key="`${r.unit.id}-${i}`"
              :unit="r.unit"
              :roll="r.roll"
              :pool-size="r.poolSize"
              :index="i"
              @open="expanded = r"
            />
          </template>
        </div>

        <div v-else-if="!notes.length" class="empty label">
          <p>Terminal idle. Sponsors standing by.</p>
          <p>Select a contender, pick a slot, choose 1–5 draws.</p>
        </div>
      </div>
    </div>

    <UnitDetailModal
      v-if="expanded"
      :unit="expanded.unit"
      :roll="expanded.roll"
      :pool-size="expanded.poolSize"
      @close="expanded = null"
    />

    <LegendaryFlash v-if="flash" :key="flash.key" :names="flash.names" @done="flash = null" />
  </section>
</template>

<style scoped>
.head {
  margin-bottom: var(--sp-5);
}

.deck {
  display: grid;
  grid-template-columns: 15rem 1fr;
  gap: var(--sp-5);
  align-items: start;
}

.console {
  padding: var(--sp-4);
  display: grid;
  gap: var(--sp-4);
  position: sticky;
  top: var(--sp-4);
}

.field {
  display: grid;
  gap: 0.4rem;
}

.field select {
  width: 100%;
}

.stepper {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1px;
  background: var(--line-bright);
  border: 1px solid var(--line-bright);
}

.step {
  background: var(--bg-raised);
  border: 0;
  color: var(--text-dim);
  font-family: var(--mono);
  font-size: 0.85rem;
  padding: 0.5rem 0;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.step:hover {
  color: var(--text);
}

.step.on {
  background: var(--cyan);
  color: var(--bg);
  font-weight: 700;
}

.summon {
  width: 100%;
  padding: 0.9rem;
  font-size: 0.78rem;
}

.stockbox {
  border-top: 1px solid var(--line);
  padding-top: var(--sp-3);
  display: grid;
  gap: 0.45rem;
}

.stock-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
}

.total {
  color: var(--text-dim);
}

.stage {
  min-height: 24rem;
}

.readout {
  padding: var(--sp-4);
  margin-bottom: var(--sp-4);
  display: grid;
  gap: var(--sp-2);
}

.rolls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.roll {
  font-size: 2rem;
  font-weight: 500;
  line-height: 1;
}

.roll small {
  display: block;
  font-size: 0.55rem;
  letter-spacing: 0.16em;
  color: var(--text-faint);
  margin-top: 0.2rem;
}

.verdict {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: var(--text-dim);
}

.who {
  color: var(--text-faint);
}

.notes {
  margin: 0;
  padding-left: 1rem;
  color: var(--amber);
  line-height: 1.9;
}

.cards {
  display: grid;
  align-items: start;
  gap: var(--sp-3);
}

/* Compact: a whole batch of five sits in one row on a laptop, no scrolling. */
.cards.compact {
  grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
  /* Stretch so a name that wraps to two lines does not leave the row ragged; each card's
     stat strip is pinned to its own bottom edge. */
  align-items: stretch;
}

.cards.full {
  grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
  gap: var(--sp-4);
}

.toggle {
  margin-left: auto;
}


.empty {
  border: 1px dashed var(--line-bright);
  padding: 3.5rem var(--sp-4);
  text-align: center;
  line-height: 2.4;
  color: var(--text-faint);
}

@media (max-width: 860px) {
  .deck {
    grid-template-columns: 1fr;
  }
  .console {
    position: static;
  }
}
</style>

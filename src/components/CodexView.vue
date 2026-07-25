<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import UnitCard from './UnitCard.vue'
import { useSession } from '../composables/useSession'
import type { Unit } from '../types'

const session = useSession()
const { state } = session

const query = ref('')
const bannerFilter = ref<number | 'all'>('all')
const rarityFilter = ref<number | 'all'>('all')
const gameFilter = ref<string>('all')
const roleFilter = ref<string>('all')
const statusFilter = ref<'all' | 'available' | 'claimed' | 'retired'>('all')
const selected = ref<Unit | null>(null)

// Portraits are hotlinked from remote wikis, so any of them can fail. Fall back to a monogram
// rather than leaving a hole in the grid.
const brokenPortraits = ref(new Set<number>())
function markBroken(id: number) {
  brokenPortraits.value = new Set(brokenPortraits.value).add(id)
}

const games = computed(() => [...new Set(state.catalog.map((u) => u.game))].filter(Boolean).sort())
const roles = computed(() => [...new Set(state.catalog.map((u) => u.role))].filter(Boolean).sort())

/**
 * What the tile leads with. Retirement only ever happens to a unit somebody already summoned,
 * so the claim is the more useful headline — `unit.retired` is surfaced alongside it rather
 * than replacing it, and the retired *filter* below keys off the flag directly.
 */
function statusOf(unit: Unit): 'available' | 'claimed' | 'retired' {
  if (session.claimedBy.value.has(unit.id)) return 'claimed'
  return unit.retired ? 'retired' : 'available'
}

function matchesStatus(unit: Unit, filter: typeof statusFilter.value): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'retired':
      return !!unit.retired
    case 'claimed':
      return session.claimedBy.value.has(unit.id)
    case 'available':
      return !session.claimedBy.value.has(unit.id) && !unit.retired
  }
}

const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return state.catalog.filter((unit) => {
    if (bannerFilter.value !== 'all' && unit.bannerId !== bannerFilter.value) return false
    if (rarityFilter.value !== 'all' && unit.rarity !== rarityFilter.value) return false
    if (gameFilter.value !== 'all' && unit.game !== gameFilter.value) return false
    if (roleFilter.value !== 'all' && unit.role !== roleFilter.value) return false
    if (!matchesStatus(unit, statusFilter.value)) return false
    if (!needle) return true
    return (
      unit.name.toLowerCase().includes(needle) ||
      unit.game.toLowerCase().includes(needle) ||
      unit.role.toLowerCase().includes(needle)
    )
  })
})

// `retired` overlaps `claimed` by design — a retired unit is one somebody already holds.
const summary = computed(() => ({
  available: state.catalog.filter((u) => matchesStatus(u, 'available')).length,
  claimed: state.catalog.filter((u) => matchesStatus(u, 'claimed')).length,
  retired: state.catalog.filter((u) => matchesStatus(u, 'retired')).length,
}))

function reset() {
  query.value = ''
  bannerFilter.value = 'all'
  rarityFilter.value = 'all'
  gameFilter.value = 'all'
  roleFilter.value = 'all'
  statusFilter.value = 'all'
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') selected.value = null
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <section>
    <header class="head">
      <div>
        <h2 class="section-title">Codex</h2>
        <p class="section-sub">
          Every operative on file, who holds them, and what is still in the pool. Read-only — the
          roster is edited in characters.csv.
        </p>
      </div>
      <div class="totals">
        <span class="pill avail">{{ summary.available }} summonable</span>
        <span class="pill claimed">{{ summary.claimed }} claimed</span>
        <span v-if="summary.retired" class="pill retired">{{ summary.retired }} retired</span>
      </div>
    </header>

    <div class="filters panel">
      <input v-model="query" type="search" placeholder="Search name, game or role…" aria-label="Search codex" />

      <select v-model="statusFilter" aria-label="Status">
        <option value="all">Any status</option>
        <option value="available">Summonable</option>
        <option value="claimed">Claimed</option>
        <option value="retired">Retired</option>
      </select>

      <select v-model="bannerFilter" aria-label="Banner">
        <option value="all">Any banner</option>
        <option v-for="b in session.banners.value" :key="b.id" :value="b.id">Banner {{ b.id }}</option>
      </select>

      <select v-model="rarityFilter" aria-label="Rarity">
        <option value="all">Any rarity</option>
        <option :value="5">5★</option>
        <option :value="4">4★</option>
        <option :value="3">3★</option>
      </select>

      <select v-model="gameFilter" aria-label="Game">
        <option value="all">Any game</option>
        <option v-for="game in games" :key="game" :value="game">{{ game }}</option>
      </select>

      <select v-model="roleFilter" aria-label="Role">
        <option value="all">Any role</option>
        <option v-for="role in roles" :key="role" :value="role">{{ role }}</option>
      </select>

      <button class="btn btn-sm" type="button" @click="reset">Reset</button>
    </div>

    <p class="count label">{{ filtered.length }} of {{ state.catalog.length }} shown</p>

    <div class="grid">
      <button
        v-for="unit in filtered"
        :key="unit.id"
        type="button"
        class="tile panel"
        :data-rarity="unit.rarity"
        :data-status="statusOf(unit)"
        @click="selected = unit"
      >
        <span class="thumb">
          <img
            v-if="unit.imageUrl && !brokenPortraits.has(unit.id)"
            :src="unit.imageUrl"
            alt=""
            loading="lazy"
            referrerpolicy="no-referrer"
            @error="markBroken(unit.id)"
          />
          <span v-else class="thumb-mono" aria-hidden="true">{{ unit.name.charAt(0).toUpperCase() }}</span>
        </span>
        <span class="info">
          <span class="name">{{ unit.name }}</span>
          <span class="stars" :class="`r${unit.rarity}`">{{ '★'.repeat(unit.rarity) }}</span>
          <span class="meta label">{{ unit.role }} · {{ unit.game }} · B{{ unit.bannerId }}</span>
        </span>
        <span class="status label">
          <template v-if="statusOf(unit) === 'claimed'">
            {{ session.claimedBy.value.get(unit.id)?.name }}<template v-if="unit.retired"> · retired</template>
          </template>
          <template v-else-if="statusOf(unit) === 'retired'">Retired</template>
          <template v-else>Summonable</template>
        </span>
      </button>
    </div>

    <p v-if="!filtered.length" class="empty label">No operatives match those filters.</p>

    <div v-if="selected" class="overlay" @click.self="selected = null">
      <div class="detail" role="dialog" aria-modal="true" :aria-label="selected.name">
        <button class="close btn btn-sm" type="button" @click="selected = null">Close</button>
        <UnitCard :unit="selected" :claimed-by="session.claimedBy.value.get(selected.id)?.name ?? null" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--sp-4);
  flex-wrap: wrap;
  margin-bottom: var(--sp-4);
}

.totals {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.avail {
  color: var(--ok);
}
.claimed {
  color: var(--magenta);
}
.retired {
  color: var(--text-faint);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  padding: var(--sp-3);
  margin-bottom: var(--sp-3);
}

.filters input[type='search'] {
  flex: 1 1 14rem;
  min-width: 0;
}

.count {
  margin-bottom: var(--sp-3);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: var(--sp-3);
}

.tile {
  --rarity: var(--r3);
  display: grid;
  grid-template-columns: 48px 1fr;
  grid-template-areas:
    'thumb info'
    'status status';
  gap: var(--sp-3);
  align-items: center;
  padding: var(--sp-3);
  text-align: left;
  cursor: pointer;
  color: inherit;
  border-color: color-mix(in srgb, var(--rarity) 26%, var(--line));
  transition:
    border-color 0.15s,
    transform 0.15s;
}

.tile[data-rarity='4'] {
  --rarity: var(--r4);
}
.tile[data-rarity='5'] {
  --rarity: var(--r5);
}

.tile:hover {
  border-color: var(--rarity);
  transform: translateY(-2px);
}

.tile[data-status='claimed'] {
  opacity: 0.62;
}

.tile[data-status='retired'] {
  opacity: 0.45;
}

.thumb {
  grid-area: thumb;
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: var(--bg-raised);
  border: 1px solid var(--line);
}

.thumb-mono {
  font-family: var(--display);
  font-size: 1.1rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--rarity) 70%, var(--text-faint));
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info {
  grid-area: info;
  min-width: 0;
  display: grid;
  gap: 0.1rem;
}

.name {
  font-weight: 600;
  font-size: 0.95rem;
  overflow-wrap: anywhere;
}

.stars {
  color: var(--rarity);
  font-size: 0.7rem;
}

.meta {
  letter-spacing: 0.1em;
  overflow-wrap: anywhere;
}

.status {
  grid-area: status;
  border-top: 1px solid var(--line);
  padding-top: 0.45rem;
  color: var(--text-dim);
}

.tile[data-status='claimed'] .status {
  color: var(--magenta);
}

.tile[data-status='available'] .status {
  color: var(--ok);
}

.empty {
  border: 1px dashed var(--line-bright);
  padding: 2.5rem;
  text-align: center;
  margin-top: var(--sp-3);
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(3, 5, 10, 0.82);
  backdrop-filter: blur(3px);
  display: grid;
  place-items: start center;
  padding: var(--sp-4);
  overflow-y: auto;
}

.detail {
  width: min(30rem, 100%);
  display: grid;
  gap: var(--sp-2);
  justify-items: end;
}

.close {
  background: var(--panel);
}
</style>

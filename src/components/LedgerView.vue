<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSession } from '../composables/useSession'
import type { Draw } from '../types'

const session = useSession()
const { state } = session

const grouped = ref(false)

const rows = computed(() =>
  [...state.draws].sort((a, b) => b.seq - a.seq).map(decorate),
)

function decorate(draw: Draw) {
  const unit = session.unitById.value.get(draw.unitId)
  return {
    draw,
    unit,
    playerName: session.playerById.value.get(draw.playerId)?.name ?? 'Unknown runner',
    name: unit?.name ?? `Unit #${draw.unitId}`,
    game: unit?.game ?? '',
    role: unit?.role ?? '',
    time: new Date(draw.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  }
}

const byPlayer = computed(() =>
  state.players.map((player) => {
    const draws = (session.drawsByPlayer.value.get(player.id) ?? []).map(decorate)
    const counts: Record<number, number> = { 3: 0, 4: 0, 5: 0 }
    for (const row of draws) counts[row.draw.tier]++
    return { player, draws, counts }
  }),
)

const totals = computed(() => {
  const counts: Record<number, number> = { 3: 0, 4: 0, 5: 0 }
  for (const draw of state.draws) counts[draw.tier]++
  return counts
})
</script>

<template>
  <section>
    <header class="head">
      <div>
        <h2 class="section-title">Ledger</h2>
        <p class="section-sub">Every draw this session, in order. Pulled operatives never return to the pool.</p>
      </div>
      <div class="right">
        <div class="totals mono">
          <span class="r5">{{ totals[5] }}×5★</span>
          <span class="r4">{{ totals[4] }}×4★</span>
          <span class="r3">{{ totals[3] }}×3★</span>
        </div>
        <button class="btn btn-sm" type="button" @click="grouped = !grouped">
          {{ grouped ? 'Show chronological' : 'Group by runner' }}
        </button>
      </div>
    </header>

    <p v-if="!state.draws.length" class="empty label">Nothing summoned yet.</p>

    <div v-else-if="!grouped" class="scroll-x panel">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Runner</th>
            <th>Operative</th>
            <th>Rarity</th>
            <th>Role</th>
            <th>Banner</th>
            <th>d100</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.draw.seq">
            <td class="mono dim">{{ row.draw.seq }}</td>
            <td>{{ row.playerName }}</td>
            <td>
              {{ row.name }}
              <span v-if="row.game" class="sub label">{{ row.game }}</span>
            </td>
            <td class="mono" :class="`r${row.draw.tier}`">{{ '★'.repeat(row.draw.tier) }}</td>
            <td class="dim">{{ row.role }}</td>
            <td class="mono">{{ row.draw.bannerId }}</td>
            <td class="mono">
              {{ row.draw.roll }}
              <span v-if="row.draw.shiftedFrom" class="sub label">from {{ row.draw.shiftedFrom }}★</span>
            </td>
            <td class="mono dim">{{ row.time }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="groups">
      <article v-for="group in byPlayer" :key="group.player.id" class="group panel">
        <header>
          <h3>{{ group.player.name }}</h3>
          <span class="label">{{ group.player.className || 'No class drawn' }}</span>
          <span class="tally mono">
            <span class="r5">{{ group.counts[5] }}×5★</span>
            <span class="r4">{{ group.counts[4] }}×4★</span>
            <span class="r3">{{ group.counts[3] }}×3★</span>
          </span>
        </header>
        <ul v-if="group.draws.length">
          <li v-for="row in group.draws" :key="row.draw.seq">
            <span class="mono seq">{{ row.draw.seq }}</span>
            <span class="who">{{ row.name }}</span>
            <span class="mono" :class="`r${row.draw.tier}`">{{ '★'.repeat(row.draw.tier) }}</span>
            <span class="label dim">B{{ row.draw.bannerId }} · d100 {{ row.draw.roll }}</span>
          </li>
        </ul>
        <p v-else class="label dim none">No draws yet.</p>
      </article>
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

.right {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.totals {
  display: flex;
  gap: var(--sp-3);
  font-size: 0.85rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
  min-width: 44rem;
}

th {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-faint);
  text-align: left;
  padding: 0.7rem 0.8rem;
  border-bottom: 1px solid var(--line-bright);
  white-space: nowrap;
}

td {
  padding: 0.6rem 0.8rem;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
}

tbody tr:hover td {
  background: var(--bg-raised);
}

.sub {
  display: block;
  color: var(--text-faint);
  letter-spacing: 0.1em;
}

.dim {
  color: var(--text-dim);
}

.groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
  gap: var(--sp-4);
}

.group {
  padding: var(--sp-4);
}

.group header {
  display: grid;
  gap: 0.2rem;
  padding-bottom: var(--sp-3);
  border-bottom: 1px solid var(--line);
  margin-bottom: var(--sp-3);
}

.group h3 {
  font-family: var(--display);
  font-size: 0.95rem;
  letter-spacing: 0.06em;
}

.tally {
  display: flex;
  gap: var(--sp-3);
  font-size: 0.72rem;
  margin-top: 0.3rem;
}

.group ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.group li {
  display: grid;
  grid-template-columns: 2rem 1fr auto;
  gap: 0.5rem;
  align-items: baseline;
  font-size: 0.9rem;
}

.group li .label {
  grid-column: 2 / -1;
}

.seq {
  color: var(--text-faint);
  font-size: 0.7rem;
}

.who {
  overflow-wrap: anywhere;
}

.none {
  color: var(--text-faint);
}

.empty {
  border: 1px dashed var(--line-bright);
  padding: 3rem;
  text-align: center;
}
</style>

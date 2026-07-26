<script setup lang="ts">
import { computed } from 'vue'
import PlayerCard from './PlayerCard.vue'
import { useSession } from '../composables/useSession'
import { MAX_PLAYERS } from '../data/defaults'

const session = useSession()
const { state } = session

const remaining = computed(() => session.remainingClasses.value.length)
const unassigned = computed(() => state.players.filter((p) => !p.className).length)
const canAddPlayer = computed(() => state.players.length < MAX_PLAYERS)

/** Classes dealt and then redrawn away — spent, held by nobody, never coming back. */
const burned = computed(() => {
  const held = new Set(state.players.map((p) => p.className).filter(Boolean))
  return state.dealtClasses.filter((c) => !held.has(c))
})
</script>

<template>
  <section>
    <header class="head">
      <div>
        <h2 class="section-title">Contender draft</h2>
        <p class="section-sub">
          The Thunderdome decides what you walk in as. Classes are dealt from a deck of
          {{ state.settings.classes.length }} — never shuffled back. Redrawing burns the class you
          were holding and deals you the next one, so nobody gets to pick and no class is ever
          dealt twice.
        </p>
      </div>
      <div class="counters">
        <div class="counter panel">
          <span class="label">Classes left</span>
          <strong class="mono">{{ remaining }}</strong>
        </div>
        <div class="counter panel">
          <span class="label">Unassigned</span>
          <strong class="mono">{{ unassigned }}</strong>
        </div>
        <div class="counter panel">
          <span class="label">Burned</span>
          <strong class="mono burned-count">{{ burned.length }}</strong>
        </div>
      </div>
    </header>

    <div class="grid">
      <PlayerCard
        v-for="(player, i) in state.players"
        :key="player.id"
        :player="player"
        :pool="state.settings.classes"
        :index="i"
        :can-remove="session.canRemovePlayer(player.id)"
        :can-draw="remaining > 0"
        @rename="session.renamePlayer(player.id, $event)"
        @draw="session.drawClass(player.id)"
        @remove="session.removePlayer(player.id)"
      />
    </div>

    <div class="stack controls">
      <button class="btn btn-primary" type="button" :disabled="!unassigned || !remaining" @click="session.drawAllUnassignedClasses()">
        Draw all unassigned
      </button>
      <button class="btn" type="button" :disabled="!canAddPlayer" @click="session.addPlayer()">
        Add contender
      </button>
      <button class="btn btn-danger" type="button" :disabled="unassigned === state.players.length" @click="session.clearClasses()">
        Clear classes
      </button>
      <p v-if="!canAddPlayer" class="note label">
        Capped at {{ MAX_PLAYERS }} contenders — one per class.
      </p>
      <p v-else-if="!remaining" class="note label">The deck is empty — every class has been dealt.</p>
    </div>

    <div v-if="burned.length" class="burned panel">
      <span class="label">Burned by redraws</span>
      <span class="burned-list">{{ burned.join(' · ') }}</span>
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
  margin-bottom: var(--sp-5);
}

.counters {
  display: flex;
  gap: var(--sp-3);
}

.counter {
  padding: var(--sp-3) var(--sp-4);
  text-align: right;
  min-width: 7.5rem;
}

.counter strong {
  display: block;
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--cyan);
  margin-top: 0.2rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: var(--sp-4);
  margin-bottom: var(--sp-5);
}

.controls {
  align-items: center;
}

.note {
  color: var(--text-dim);
}

.burned-count {
  color: var(--danger) !important;
}

.burned {
  margin-top: var(--sp-4);
  padding: var(--sp-3) var(--sp-4);
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.burned-list {
  font-family: var(--mono);
  font-size: 0.78rem;
  color: var(--danger);
  text-decoration: line-through;
  text-decoration-color: color-mix(in srgb, var(--danger) 60%, transparent);
}
</style>

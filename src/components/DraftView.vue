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
</script>

<template>
  <section>
    <header class="head">
      <div>
        <h2 class="section-title">Class draft</h2>
        <p class="section-sub">
          The grid rewrites what they were. Every runner wakes up as a different class — no class is
          ever handed out twice.
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
        :can-draw="remaining > 0 || !!player.className"
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
        Add runner
      </button>
      <button class="btn btn-danger" type="button" :disabled="unassigned === state.players.length" @click="session.clearClasses()">
        Clear classes
      </button>
      <p v-if="!canAddPlayer" class="note label">
        Capped at {{ MAX_PLAYERS }} runners — one per class.
      </p>
      <p v-else-if="!remaining" class="note label">Every class is spoken for.</p>
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
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SaveChip from './components/SaveChip.vue'
import SponsorTicker from './components/SponsorTicker.vue'
import DraftView from './components/DraftView.vue'
import SummonView from './components/SummonView.vue'
import CodexView from './components/CodexView.vue'
import LedgerView from './components/LedgerView.vue'
import SessionView from './components/SessionView.vue'
import { useSession } from './composables/useSession'

type TabId = 'draft' | 'summon' | 'codex' | 'ledger' | 'session'

const session = useSession()
const tab = ref<TabId>('draft')

const tabs: { id: TabId; label: string }[] = [
  { id: 'draft', label: 'Draft' },
  { id: 'summon', label: 'Summon' },
  { id: 'codex', label: 'Codex' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'session', label: 'Session' },
]

const views = {
  draft: DraftView,
  summon: SummonView,
  codex: CodexView,
  ledger: LedgerView,
  session: SessionView,
}

const drawCount = computed(() => session.state.draws.length)
const unitCount = computed(() => session.state.catalog.filter((u) => !u.retired).length)
</script>

<template>
  <div class="shell">
    <header class="masthead">
      <div class="brand">
        <div class="wordmark">
          EVEN<span>ODDS</span>
        </div>
        <div class="tagline label">
          Thunderdome · sponsor draw terminal · {{ unitCount }} assets indexed
        </div>
      </div>

      <SaveChip />

      <nav role="tablist" aria-label="Sections">
        <button
          v-for="item in tabs"
          :key="item.id"
          role="tab"
          type="button"
          :aria-selected="tab === item.id"
          :class="{ active: tab === item.id }"
          @click="tab = item.id"
        >
          {{ item.label }}
          <span v-if="item.id === 'ledger' && drawCount" class="count">{{ drawCount }}</span>
        </button>
      </nav>
    </header>

    <main>
      <component :is="views[tab]" />
    </main>

    <footer>
      <SponsorTicker />
      <span class="label fineprint">
        Front-end only · nothing leaves this browser · export to keep a copy
      </span>
    </footer>
  </div>
</template>

<style scoped>
.shell {
  position: relative;
  z-index: 1;
  max-width: var(--shell-max);
  margin: 0 auto;
  padding: 0 var(--sp-4);
}

.masthead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sp-4);
  flex-wrap: wrap;
  padding: var(--sp-5) 0 var(--sp-3);
  border-bottom: 1px solid var(--line);
  position: relative;
}

/* Animated hairline: the one always-on motion cue that the terminal is live. */
.masthead::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--cyan), var(--magenta), transparent);
  background-size: 200% 100%;
  animation: sweep 7s linear infinite;
  opacity: 0.65;
}

@keyframes sweep {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

.wordmark {
  font-family: var(--display);
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: var(--text);
  line-height: 1;
}

.wordmark span {
  color: var(--cyan);
  text-shadow: 0 0 22px rgba(0, 229, 255, 0.55);
}

.tagline {
  margin-top: 0.55rem;
}

nav {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
}

nav button {
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-dim);
  background: none;
  border: 0;
  border-bottom: 2px solid transparent;
  padding: 0.6rem 0.9rem;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
}

nav button:hover {
  color: var(--text);
}

nav button.active {
  color: var(--cyan);
  border-bottom-color: var(--cyan);
}

.count {
  font-size: 0.6rem;
  color: var(--bg);
  background: var(--cyan);
  padding: 0.05rem 0.3rem;
  margin-left: 0.35rem;
}

main {
  padding: var(--sp-6) 0 var(--sp-6);
  min-height: 60vh;
}

footer {
  border-top: 1px solid var(--line);
  padding: var(--sp-4) 0 var(--sp-6);
  display: grid;
  gap: var(--sp-3);
}

.fineprint {
  color: var(--text-faint);
}

@media (max-width: 720px) {
  .masthead {
    align-items: flex-start;
  }
  nav {
    order: 3;
    width: 100%;
    overflow-x: auto;
    flex-wrap: nowrap;
  }
  nav button {
    padding: 0.6rem 0.7rem;
  }
}
</style>

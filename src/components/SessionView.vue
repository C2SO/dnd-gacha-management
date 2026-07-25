<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSession } from '../composables/useSession'
import {
  downloadSession,
  importCatalogCsv,
  importSessionJson,
  readFileAsText,
} from '../composables/useSessionFile'

const session = useSession()
const { state } = session

const jsonInput = ref<HTMLInputElement | null>(null)
const csvInput = ref<HTMLInputElement | null>(null)
const confirmingReset = ref(false)

type Report = { tone: 'ok' | 'warn' | 'error'; title: string; lines: string[] }
const report = ref<Report | null>(null)

const stats = computed(() => ({
  units: state.catalog.length,
  retired: state.catalog.filter((u) => u.retired).length,
  players: state.players.length,
  draws: state.draws.length,
}))

async function onJsonPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  try {
    const result = importSessionJson(await readFileAsText(file))
    if (!result.ok || !result.session) {
      report.value = { tone: 'error', title: 'Session not loaded', lines: result.errors }
      return
    }
    session.replaceSession(result.session)
    report.value = {
      tone: result.warnings.length ? 'warn' : 'ok',
      title: `Loaded ${file.name}`,
      lines: [
        `${result.session.players.length} contenders · ${result.session.draws.length} draws · ${result.session.catalog.length} units`,
        ...result.warnings,
      ],
    }
  } catch (error) {
    report.value = { tone: 'error', title: 'Session not loaded', lines: [String(error)] }
  }
}

async function onCsvPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  try {
    const parsed = await importCatalogCsv(file)
    if (parsed.errors.length) {
      report.value = {
        tone: 'error',
        title: `${file.name} rejected — nothing was changed`,
        lines: parsed.errors.slice(0, 12),
      }
      return
    }

    const summary = session.applyCatalog(parsed.units)
    report.value = {
      tone: parsed.warnings.length ? 'warn' : 'ok',
      title: `Loaded ${parsed.units.length} characters from ${file.name}`,
      lines: [
        `${summary.updated} updated · ${summary.added} added · ${summary.removed} removed · ${summary.retained} kept as retired (already summoned)`,
        `Draw history untouched: ${state.draws.length} draws still recorded.`,
        ...(parsed.repairedCells.length
          ? [`Repaired ${parsed.repairedCells.length} mis-encoded cell(s).`]
          : []),
        ...parsed.warnings,
      ],
    }
  } catch (error) {
    report.value = { tone: 'error', title: 'Characters not loaded', lines: [String(error)] }
  }
}

function exportNow() {
  downloadSession(state)
  report.value = { tone: 'ok', title: 'Session exported', lines: ['Keep the file safe — it restores everything.'] }
}

function doReset() {
  session.resetSession()
  confirmingReset.value = false
  report.value = { tone: 'ok', title: 'Session reset', lines: ['Classes and draws cleared. Contenders and catalog kept.'] }
}

function slotStock(bannerId: number) {
  return session.stockFor(bannerId)
}

function slotEvens(bannerId: number): string {
  const left = session.remainingOn(bannerId)
  return left ? `${left} left · 1 in ${left} each` : 'Sold out'
}
</script>

<template>
  <section>
    <header class="head">
      <h2 class="section-title">Session</h2>
      <p class="section-sub">
        Everything lives in this browser. Export writes one JSON file with the catalog, contenders,
        slots and the full ledger — import it anywhere to pick the session back up.
      </p>
    </header>

    <div class="cols">
      <div class="panel block">
        <h3 class="block-title">Save file</h3>
        <dl class="stats">
          <div><dt class="label">Units</dt><dd class="mono">{{ stats.units }}</dd></div>
          <div><dt class="label">Retired</dt><dd class="mono">{{ stats.retired }}</dd></div>
          <div><dt class="label">Contenders</dt><dd class="mono">{{ stats.players }}</dd></div>
          <div><dt class="label">Draws</dt><dd class="mono">{{ stats.draws }}</dd></div>
        </dl>

        <div class="stack">
          <button class="btn btn-primary" type="button" @click="exportNow">Export session JSON</button>
          <button class="btn" type="button" @click="jsonInput?.click()">Import session JSON</button>
        </div>
        <input ref="jsonInput" class="sr-only" type="file" accept="application/json,.json" @change="onJsonPicked" />
      </div>

      <div class="panel block">
        <h3 class="block-title">Sponsored assets</h3>
        <p class="hint">
          The catalog is built from <code>data/characters.csv</code>. Load an updated CSV here to
          refresh stats mid-session — IDs keep their identity and nobody loses what they already
          drew.
        </p>
        <div class="stack">
          <button class="btn" type="button" @click="csvInput?.click()">Import characters CSV</button>
        </div>
        <input ref="csvInput" class="sr-only" type="file" accept="text/csv,.csv" @change="onCsvPicked" />
      </div>

      <div class="panel block danger">
        <h3 class="block-title">Reset</h3>
        <p class="hint">Clears drawn classes and the whole ledger. Contender names and the catalog stay.</p>
        <div class="stack">
          <button v-if="!confirmingReset" class="btn btn-danger" type="button" @click="confirmingReset = true">
            Reset session
          </button>
          <template v-else>
            <button class="btn btn-danger" type="button" @click="doReset">Confirm reset</button>
            <button class="btn" type="button" @click="confirmingReset = false">Cancel</button>
          </template>
        </div>
      </div>
    </div>

    <div v-if="report" class="panel report" :class="report.tone" role="status">
      <div class="report-head">
        <strong>{{ report.title }}</strong>
        <button class="btn btn-sm" type="button" @click="report = null">Dismiss</button>
      </div>
      <ul>
        <li v-for="(line, i) in report.lines" :key="i">{{ line }}</li>
      </ul>
    </div>

    <div class="panel block wide">
      <h3 class="block-title">Broadcast slots</h3>
      <p class="hint">
        Under Even Odds rules there is nothing to weight: a draw is one die with a face per asset
        still in the slot, so every asset is equally likely and rarity is descriptive only. All
        you can set is what each slot is called.
      </p>

      <div class="banner-grid">
        <div v-for="banner in state.settings.banners" :key="banner.id" class="banner">
          <span class="label">Slot {{ banner.id }}</span>
          <input v-model="banner.name" type="text" :aria-label="`Slot ${banner.id} name`" />
          <div class="odds mono">
            <span class="r3">{{ slotStock(banner.id)[3] }}×3★</span>
            <span class="r4">{{ slotStock(banner.id)[4] }}×4★</span>
            <span class="r5">{{ slotStock(banner.id)[5] }}×5★</span>
          </div>
          <span class="label evens">{{ slotEvens(banner.id) }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.head {
  margin-bottom: var(--sp-5);
  max-width: 46rem;
}

.cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
  gap: var(--sp-4);
}

.block {
  padding: var(--sp-4);
  display: grid;
  gap: var(--sp-3);
  align-content: start;
}

.wide {
  margin-top: var(--sp-4);
}

.block-title {
  font-family: var(--display);
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--cyan);
}

.danger .block-title {
  color: var(--danger);
}

.hint {
  font-size: 0.88rem;
  color: var(--text-dim);
  line-height: 1.5;
}

code {
  font-family: var(--mono);
  font-size: 0.8rem;
  color: var(--text);
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--sp-2);
  margin: 0;
}

.stats dd {
  margin: 0.1rem 0 0;
  font-size: 1.15rem;
  color: var(--cyan);
}

.report {
  margin-top: var(--sp-4);
  padding: var(--sp-4);
  border-left: 3px solid var(--cyan);
}

.report.warn {
  border-left-color: var(--warn);
}

.report.error {
  border-left-color: var(--danger);
}

.report-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sp-3);
  margin-bottom: var(--sp-2);
}

.report ul {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.88rem;
  color: var(--text-dim);
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.banner-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: var(--sp-4);
}

.banner {
  display: grid;
  gap: 0.4rem;
  padding: var(--sp-3);
  background: var(--bg-raised);
  border: 1px solid var(--line);
}

.thresholds {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-2);
}

.thresholds label {
  display: grid;
  gap: 0.2rem;
}

.thresholds input {
  width: 100%;
}

.odds {
  display: flex;
  gap: var(--sp-3);
  font-size: 0.8rem;
}
</style>

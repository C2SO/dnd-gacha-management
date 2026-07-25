<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSession } from '../composables/useSession'
import {
  downloadSession,
  importCatalogCsv,
  importSessionJson,
  readFileAsText,
} from '../composables/useSessionFile'
import { bannerOdds } from '../utils/drawEngine'

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
        `${result.session.players.length} runners · ${result.session.draws.length} draws · ${result.session.catalog.length} units`,
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
  report.value = { tone: 'ok', title: 'Session reset', lines: ['Classes and draws cleared. Runners and catalog kept.'] }
}

function clampThresholds(id: number) {
  const banner = state.settings.banners.find((b) => b.id === id)
  if (!banner) return
  banner.t3 = Math.min(100, Math.max(0, Math.round(banner.t3 || 0)))
  banner.t4 = Math.min(100, Math.max(banner.t3, Math.round(banner.t4 || 0)))
}
</script>

<template>
  <section>
    <header class="head">
      <h2 class="section-title">Session</h2>
      <p class="section-sub">
        Everything lives in this browser. Export writes one JSON file with the catalog, runners,
        banners and the full ledger — import it anywhere to pick the session back up.
      </p>
    </header>

    <div class="cols">
      <div class="panel block">
        <h3 class="block-title">Save file</h3>
        <dl class="stats">
          <div><dt class="label">Units</dt><dd class="mono">{{ stats.units }}</dd></div>
          <div><dt class="label">Retired</dt><dd class="mono">{{ stats.retired }}</dd></div>
          <div><dt class="label">Runners</dt><dd class="mono">{{ stats.players }}</dd></div>
          <div><dt class="label">Draws</dt><dd class="mono">{{ stats.draws }}</dd></div>
        </dl>

        <div class="stack">
          <button class="btn btn-primary" type="button" @click="exportNow">Export session JSON</button>
          <button class="btn" type="button" @click="jsonInput?.click()">Import session JSON</button>
        </div>
        <input ref="jsonInput" class="sr-only" type="file" accept="application/json,.json" @change="onJsonPicked" />
      </div>

      <div class="panel block">
        <h3 class="block-title">Characters</h3>
        <p class="hint">
          The catalog is built from <code>data/characters.csv</code>. Load an updated CSV here to
          refresh stats mid-session — IDs keep their identity and nobody loses what they already
          summoned.
        </p>
        <div class="stack">
          <button class="btn" type="button" @click="csvInput?.click()">Import characters CSV</button>
        </div>
        <input ref="csvInput" class="sr-only" type="file" accept="text/csv,.csv" @change="onCsvPicked" />
      </div>

      <div class="panel block danger">
        <h3 class="block-title">Reset</h3>
        <p class="hint">Clears drawn classes and the whole ledger. Runner names and the catalog stay.</p>
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
      <h3 class="block-title">Banners &amp; odds</h3>
      <p class="hint">
        A d100 is rolled per draw: at or below the 3★ threshold gives 3★, at or below the 4★
        threshold gives 4★, anything above is 5★.
      </p>

      <div class="banner-grid">
        <div v-for="banner in state.settings.banners" :key="banner.id" class="banner">
          <span class="label">Banner {{ banner.id }}</span>
          <input v-model="banner.name" type="text" :aria-label="`Banner ${banner.id} name`" />
          <div class="thresholds">
            <label>
              <span class="label">3★ ≤</span>
              <input
                v-model.number="banner.t3"
                type="number"
                min="0"
                max="100"
                @change="clampThresholds(banner.id)"
              />
            </label>
            <label>
              <span class="label">4★ ≤</span>
              <input
                v-model.number="banner.t4"
                type="number"
                min="0"
                max="100"
                @change="clampThresholds(banner.id)"
              />
            </label>
          </div>
          <div class="odds mono">
            <span class="r3">{{ bannerOdds(banner)[3] }}%</span>
            <span class="r4">{{ bannerOdds(banner)[4] }}%</span>
            <span class="r5">{{ bannerOdds(banner)[5] }}%</span>
          </div>
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

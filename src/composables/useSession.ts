import { computed, reactive, ref, watch } from 'vue'
import type { Draw, Player, SessionFile, Unit } from '../types'
import { bannerFallback, buildDefaultSession, createPlayer, MAX_PLAYERS } from '../data/defaults'
import { availableByRarity, availableClasses, drawClassFrom, summonMany } from '../utils/drawEngine'

const STORAGE_KEY = 'dnd-gacha-session-v1'
const SAVE_DEBOUNCE_MS = 250

export type StorageMode = 'local' | 'memory'
export type SaveState = 'clean' | 'saving' | 'saved' | 'unavailable'

const state = reactive<SessionFile>(buildDefaultSession())
const storageMode = ref<StorageMode>('memory')
const saveState = ref<SaveState>('clean')
const lastSavedAt = ref<string | null>(null)

function canUseLocalStorage(): boolean {
  try {
    const probe = `${STORAGE_KEY}-probe`
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

/** Shallow shape check — enough to reject unrelated JSON without rejecting hand-edited saves. */
export function looksLikeSession(value: unknown): value is SessionFile {
  const candidate = value as Partial<SessionFile> | null
  return (
    !!candidate &&
    typeof candidate === 'object' &&
    Array.isArray(candidate.players) &&
    Array.isArray(candidate.draws) &&
    !!candidate.settings &&
    Array.isArray(candidate.settings.banners)
  )
}

function assign(next: SessionFile) {
  state.format = next.format
  state.version = next.version
  state.savedAt = next.savedAt
  state.settings = next.settings
  state.catalog = next.catalog
  state.players = next.players
  state.draws = next.draws
}

let saveTimer: ReturnType<typeof setTimeout> | undefined

function persist() {
  if (storageMode.value !== 'local') return
  clearTimeout(saveTimer)
  saveState.value = 'saving'
  saveTimer = setTimeout(() => {
    try {
      state.savedAt = new Date().toISOString()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      lastSavedAt.value = state.savedAt
      saveState.value = 'saved'
    } catch {
      // Most likely a full quota. Downgrade rather than losing the session to a thrown error.
      storageMode.value = 'memory'
      saveState.value = 'unavailable'
    }
  }, SAVE_DEBOUNCE_MS)
}

let booted = false

function boot() {
  if (booted) return
  booted = true

  if (!canUseLocalStorage()) {
    storageMode.value = 'memory'
    saveState.value = 'unavailable'
  } else {
    storageMode.value = 'local'
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (looksLikeSession(parsed)) {
          assign(migrate(parsed))
          lastSavedAt.value = state.savedAt
          saveState.value = 'saved'
        }
      }
    } catch {
      // A corrupt autosave should never brick the app; fall back to the fresh session.
      saveState.value = 'clean'
    }
  }

  watch(state, persist, { deep: true })
}

/** Fills in anything an older or hand-written save left out. */
export function migrate(input: SessionFile): SessionFile {
  const base = buildDefaultSession()
  return {
    format: base.format,
    version: base.version,
    savedAt: input.savedAt ?? base.savedAt,
    settings: {
      classes: input.settings?.classes?.length ? input.settings.classes : base.settings.classes,
      // Strip any leftover v1 rarity thresholds; banners now carry nothing but a name.
      banners: (input.settings?.banners?.length ? input.settings.banners : base.settings.banners).map(
        (b) => ({ id: b.id, name: b.name }),
      ),
    },
    catalog: input.catalog?.length ? input.catalog : base.catalog,
    players: (input.players ?? []).map((p) => ({
      id: p.id ?? createPlayer(p.name ?? 'Contender').id,
      name: p.name ?? 'Contender',
      className: p.className ?? null,
    })),
    // v1 draws carried `tier`/`shiftedFrom` from the old weighted d100 and no `poolSize`;
    // rarity now comes from the catalog, and a missing pool size just reads as unknown.
    draws: (input.draws ?? []).map((d, i) => ({
      seq: d.seq ?? i + 1,
      unitId: d.unitId,
      playerId: d.playerId,
      bannerId: d.bannerId,
      roll: d.roll ?? 0,
      poolSize: d.poolSize ?? 0,
      at: d.at ?? new Date().toISOString(),
    })),
  }
}

export function useSession() {
  boot()

  const unitById = computed(() => new Map(state.catalog.map((u) => [u.id, u])))
  const playerById = computed(() => new Map(state.players.map((p) => [p.id, p])))
  const takenUnitIds = computed(() => new Set(state.draws.map((d) => d.unitId)))

  /** Banners from settings, plus any banner the catalog references but settings omits. */
  const banners = computed(() => {
    const known = new Map(state.settings.banners.map((b) => [b.id, b]))
    for (const unit of state.catalog) {
      if (!known.has(unit.bannerId)) known.set(unit.bannerId, bannerFallback(unit.bannerId))
    }
    return [...known.values()].sort((a, b) => a.id - b.id)
  })

  const remainingClasses = computed(() => availableClasses(state.settings.classes, state.players))

  const claimedBy = computed(() => {
    const map = new Map<number, Player>()
    for (const draw of state.draws) {
      const player = playerById.value.get(draw.playerId)
      if (player) map.set(draw.unitId, player)
    }
    return map
  })

  const drawsByPlayer = computed(() => {
    const map = new Map<string, Draw[]>(state.players.map((p) => [p.id, []]))
    for (const draw of state.draws) {
      map.get(draw.playerId)?.push(draw)
    }
    return map
  })

  function stockFor(bannerId: number) {
    return availableByRarity(state.catalog, bannerId, takenUnitIds.value)
  }

  function remainingOn(bannerId: number): number {
    const stock = stockFor(bannerId)
    return stock[3] + stock[4] + stock[5]
  }

  function addPlayer(): Player | null {
    if (state.players.length >= MAX_PLAYERS) return null
    const player = createPlayer(`Contender ${state.players.length + 1}`)
    state.players.push(player)
    return player
  }

  /**
   * Removing a player who has already summoned would orphan their draws — and those units are
   * out of the pool for good — so that is blocked rather than silently discarding history.
   */
  function canRemovePlayer(playerId: string): boolean {
    if (state.players.length <= 1) return false
    return !state.draws.some((d) => d.playerId === playerId)
  }

  function removePlayer(playerId: string): boolean {
    if (!canRemovePlayer(playerId)) return false
    state.players = state.players.filter((p) => p.id !== playerId)
    return true
  }

  function renamePlayer(playerId: string, name: string) {
    const player = playerById.value.get(playerId)
    if (player) player.name = name
  }

  function drawClass(playerId: string): string | null {
    const player = playerById.value.get(playerId)
    if (!player) return null
    // Free the player's current class first so a redraw can land on it again.
    const pool = availableClasses(
      state.settings.classes,
      state.players.filter((p) => p.id !== playerId),
    )
    const drawn = drawClassFrom(pool)
    if (drawn) player.className = drawn
    return drawn
  }

  function drawAllUnassignedClasses(): { playerId: string; className: string }[] {
    const assigned: { playerId: string; className: string }[] = []
    for (const player of state.players) {
      if (player.className) continue
      const drawn = drawClass(player.id)
      if (!drawn) break
      assigned.push({ playerId: player.id, className: drawn })
    }
    return assigned
  }

  function clearClasses() {
    for (const player of state.players) player.className = null
  }

  function summon(playerId: string, bannerId: number, count: number) {
    const banner = banners.value.find((b) => b.id === bannerId)
    if (!banner || !playerById.value.has(playerId)) {
      return { results: [], exhausted: true, draws: [] as Draw[] }
    }

    const outcome = summonMany(state.catalog, banner.id, takenUnitIds.value, count)
    const at = new Date().toISOString()
    let seq = state.draws.reduce((max, d) => Math.max(max, d.seq), 0)

    const draws: Draw[] = outcome.results.map((result) => ({
      seq: ++seq,
      unitId: result.unit.id,
      playerId,
      bannerId,
      roll: result.roll,
      poolSize: result.poolSize,
      at,
    }))

    state.draws.push(...draws)
    return { ...outcome, draws }
  }

  /**
   * Swaps in a freshly parsed catalog while protecting recorded history: stats are updated in
   * place, new units join the pool, and a dropped unit someone already summoned is retired
   * rather than deleted so its draw never dangles.
   */
  function applyCatalog(incoming: Unit[]) {
    const currentById = new Map(state.catalog.map((u) => [u.id, u]))
    const incomingIds = new Set(incoming.map((u) => u.id))
    const taken = takenUnitIds.value

    const merged: Unit[] = incoming.map((unit) => {
      const existing = currentById.get(unit.id)
      // A unit that reappears in the CSV is summonable again, so `retired` is not carried over.
      return existing ? { ...existing, ...unit, retired: false } : unit
    })

    const retained = state.catalog.filter((u) => !incomingIds.has(u.id) && taken.has(u.id))
    for (const unit of retained) merged.push({ ...unit, retired: true })

    const summary = {
      updated: incoming.filter((u) => currentById.has(u.id)).length,
      added: incoming.filter((u) => !currentById.has(u.id)).length,
      removed: state.catalog.filter((u) => !incomingIds.has(u.id) && !taken.has(u.id)).length,
      retained: retained.length,
    }

    state.catalog = merged.sort((a, b) => a.id - b.id)
    return summary
  }

  function replaceSession(next: SessionFile) {
    assign(migrate(next))
  }

  /** Wipes classes and draws but keeps the roster and catalog. */
  function resetSession() {
    clearClasses()
    state.draws = []
  }

  return {
    state,
    storageMode,
    saveState,
    lastSavedAt,
    unitById,
    playerById,
    takenUnitIds,
    claimedBy,
    banners,
    remainingClasses,
    drawsByPlayer,
    stockFor,
    remainingOn,
    addPlayer,
    canRemovePlayer,
    removePlayer,
    renamePlayer,
    drawClass,
    drawAllUnassignedClasses,
    clearClasses,
    summon,
    applyCatalog,
    replaceSession,
    resetSession,
  }
}

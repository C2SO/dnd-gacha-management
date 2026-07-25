import type { Banner, SessionFile, Unit } from '../types'
import { SESSION_FORMAT, SESSION_VERSION } from '../types'
import generatedCatalog from './catalog.generated.json'
import { createId } from '../utils/random'

/** Built from `data/characters.csv` by `scripts/build-catalog.mjs`. */
export const BUNDLED_CATALOG = generatedCatalog as Unit[]

export const DND_CLASSES = [
  'Barbarian',
  'Bard',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Paladin',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Warlock',
  'Wizard',
]

/**
 * d100 thresholds carried over from the original terminal: each banner up the chain trades
 * common stock for legendary odds. Editable in the Session tab and stored in the save file.
 */
export const DEFAULT_BANNERS: Banner[] = [
  { id: 1, name: 'Cold Boot — Street Grid', t3: 57, t4: 87 },
  { id: 2, name: 'Power Surge — Corpo Tier', t3: 50, t4: 80 },
  { id: 3, name: 'Black Ice — Legend Protocol', t3: 40, t4: 73 },
]

export const DEFAULT_PLAYER_COUNT = 4
export const MAX_PLAYERS = DND_CLASSES.length

export function createPlayer(name: string) {
  return { id: createId('runner'), name, className: null }
}

export function buildDefaultSession(): SessionFile {
  return {
    format: SESSION_FORMAT,
    version: SESSION_VERSION,
    savedAt: new Date().toISOString(),
    settings: {
      classes: [...DND_CLASSES],
      banners: DEFAULT_BANNERS.map((b) => ({ ...b })),
    },
    catalog: BUNDLED_CATALOG.map((u) => ({ ...u })),
    players: Array.from({ length: DEFAULT_PLAYER_COUNT }, (_, i) => createPlayer(`Runner ${i + 1}`)),
    draws: [],
  }
}

/**
 * Banners present in the catalog but absent from settings still need somewhere to live, so a
 * CSV that introduces "Banner 4" does not silently hide its units.
 */
export function bannerFallback(id: number): Banner {
  return { id, name: `Banner ${id}`, t3: 57, t4: 87 }
}

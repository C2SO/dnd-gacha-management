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
 * Broadcast slots the sponsors buy into. Under Even Odds they carry no weighting — a banner
 * is just which slate of assets is on offer. Names are editable in the Session tab.
 */
export const DEFAULT_BANNERS: Banner[] = [
  { id: 1, name: 'Opening Slate' },
  { id: 2, name: 'Prime Slot' },
  { id: 3, name: 'Headline Slot' },
]

export const DEFAULT_PLAYER_COUNT = 4
export const MAX_PLAYERS = DND_CLASSES.length

export function createPlayer(name: string) {
  return { id: createId('contender'), name, className: null }
}

/** Sponsor spots shown in the footer ticker. Pure flavor. */
export const SPONSOR_SLOGANS = [
  'EVEN ODDS™ — every asset equally likely. Audited by the Thunderdome Commission.',
  'No weighting. No favorites. No thumb on the scale. Just the die.',
  'Your sponsor thanks you for your continued participation.',
  'One die, one face per asset. Simple enough for the cheap seats.',
  'Ask your sponsor about post-match survivorship coverage.',
  'The Thunderdome: where everyone gets a fair shot at getting hit.',
  'Brand visibility you can bleed for.',
]

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
    players: Array.from({ length: DEFAULT_PLAYER_COUNT }, (_, i) => createPlayer(`Contender ${i + 1}`)),
    draws: [],
    dealtClasses: [],
  }
}

/**
 * Banners present in the catalog but absent from settings still need somewhere to live, so a
 * CSV that introduces "Banner 4" does not silently hide its assets.
 */
export function bannerFallback(id: number): Banner {
  return { id, name: `Slot ${id}` }
}

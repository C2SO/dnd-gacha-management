/** Every field the app knows about a character. Mirrors `data/characters.csv`. */
export interface Unit {
  /** The CSV `ID` column. Stable identity: draws reference this, never the name. */
  id: number
  name: string
  /** Source franchise, e.g. "Azur Lane". CSV `Game`. */
  game: string
  /** DPS | Support | Tank. CSV `Type`. */
  role: string
  bannerId: number
  /** 3, 4 or 5. */
  rarity: number
  hp: number
  hpFormula: string
  ac: string
  attackBonus: string
  attackKind: string
  attackAbility: string
  attackRange: string
  attackTargets: string
  damage: string
  damageType: string
  bonusDamage: string
  bonusDamageType: string
  speed: string
  /** Human-readable summary line, e.g. "WIS +8 / CHA +7". */
  saves: string
  saveMods: SaveMods
  /** Abilities the unit is proficient in, parsed from CSV `SaveProficient`. */
  saveProficient: string[]
  attack: string
  baselineName: string
  baselineText: string
  healing: string
  special: string
  /** "Ultimate", "Passive", or "". */
  capstoneType: string
  capstoneText: string
  imageUrl: string
  /**
   * Set when a CSV re-import dropped this unit but a player had already summoned it.
   * Retired units never return to the pool but stay visible in the codex and ledger,
   * so historical draws never dangle.
   */
  retired?: boolean
}

export const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const
export type Ability = (typeof ABILITIES)[number]
export type SaveMods = Record<Ability, string>

export interface Banner {
  id: number
  name: string
  /** d100 <= t3 yields 3★. */
  t3: number
  /** d100 <= t4 (and > t3) yields 4★; anything higher is 5★. */
  t4: number
}

export interface Player {
  id: string
  name: string
  className: string | null
}

export interface Draw {
  /** Monotonic per session, shown as the ledger's entry number. */
  seq: number
  unitId: number
  playerId: string
  bannerId: number
  /** The d100 that produced this draw. */
  roll: number
  /** Rarity actually awarded. */
  tier: number
  /** Set when the rolled tier was empty and the draw stepped to a different one. */
  shiftedFrom: number | null
  /** ISO timestamp. */
  at: string
}

export interface SessionSettings {
  classes: string[]
  banners: Banner[]
}

/** The whole application state, and byte-for-byte what import/export writes. */
export interface SessionFile {
  format: 'dnd-gacha-session'
  version: 1
  savedAt: string
  settings: SessionSettings
  catalog: Unit[]
  players: Player[]
  draws: Draw[]
}

export const SESSION_FORMAT = 'dnd-gacha-session'
export const SESSION_VERSION = 1

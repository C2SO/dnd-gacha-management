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

/**
 * A draw pool. Under Even Odds rules a banner carries no weighting of its own — every asset
 * still in it is equally likely — so there is nothing to configure but the name.
 */
export interface Banner {
  id: number
  name: string
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
  /**
   * The face rolled on a die with one side per asset left in the pool. Recorded with
   * `poolSize` so the ledger can show the true odds of the draw as it happened.
   */
  roll: number
  poolSize: number
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
  version: 3
  savedAt: string
  settings: SessionSettings
  catalog: Unit[]
  players: Player[]
  draws: Draw[]
  /**
   * Every class handed out this session, including ones since redrawn away. Classes are dealt
   * from a deck rather than drawn from a hat: a redraw burns the old class instead of shuffling
   * it back, so no class is ever dealt twice.
   */
  dealtClasses: string[]
}

export const SESSION_FORMAT = 'dnd-gacha-session'
/**
 * v2 dropped per-banner rarity thresholds in favor of flat Even Odds draws.
 * v3 added `dealtClasses` so classes are consumed from a deck rather than reshuffled.
 */
export const SESSION_VERSION = 3

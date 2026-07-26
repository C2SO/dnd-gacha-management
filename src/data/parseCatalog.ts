import Papa from 'papaparse'
// Explicit .ts extension: `scripts/build-catalog.mjs` imports this module directly and Node's
// resolver, unlike Vite's, will not infer the extension for a runtime (non-type) import.
import type { SaveMods, Unit } from '../types.ts'
import { ABILITIES } from '../types.ts'

/**
 * Shared CSV -> Unit[] pipeline.
 *
 * Deliberately dependency-light and DOM-free so the exact same code runs in two places:
 *   - `scripts/build-catalog.mjs` at build time (Node strips the types), and
 *   - the in-app "Import characters CSV" button (bundled by Vite).
 *
 * Keeping one implementation means a CSV that builds successfully is guaranteed to import
 * successfully, and vice versa.
 */

export interface RepairedCell {
  /** 1-based data row (the header is not counted). Not the physical file line: quoted
   * fields in this CSV span multiple lines. */
  row: number
  column: string
  before: string
  after: string
}

export interface CatalogParseResult {
  units: Unit[]
  /** Fatal problems. When non-empty the caller must discard `units` entirely. */
  errors: string[]
  /** Non-fatal observations worth showing the user. */
  warnings: string[]
  encoding: 'utf-8' | 'windows-1252'
  repairedCells: RepairedCell[]
}

/** Columns without which a row cannot be identified or placed in the draw pool. */
const REQUIRED_COLUMNS = ['ID', 'Name', 'Game', 'Type', 'Banner', 'Rarity'] as const

/** Every column the app reads. Anything else in the file is ignored with a warning. */
const KNOWN_COLUMNS = [
  ...REQUIRED_COLUMNS,
  'HP',
  'HPFormula',
  'AC',
  'AttackBonus',
  'AttackKind',
  'AttackAbility',
  'AttackRange',
  'AttackTargets',
  'Damage',
  'DamageType',
  'BonusDamage',
  'BonusDamageType',
  'Speed',
  'Saves',
  'SaveSTR',
  'SaveDEX',
  'SaveCON',
  'SaveINT',
  'SaveWIS',
  'SaveCHA',
  'SaveProficient',
  'Attack',
  'BaselineName',
  'BaselineText',
  'Healing',
  'Special',
  'CapstoneType',
  'CapstoneText',
  'ImageURL',
] as const

/**
 * windows-1252 maps 0x80-0x9F to typographic characters rather than C1 controls, so a
 * naive `charCodeAt` round-trip would lose them. This inverts that slice of the table.
 */
const CP1252_HIGH_REVERSE = new Map<number, number>([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
  [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
  [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
  [0x017e, 0x9e], [0x0178, 0x9f],
])

/**
 * The signature of UTF-8 bytes that were once decoded as windows-1252 ("S\u00c3\u00a3o Martinho"):
 * a lead byte (0xC2-0xF4) followed by a continuation byte (0x80-0xBF), as those bytes render
 * under cp1252. The continuation half is derived from the reverse table above so the two can
 * never drift apart.
 */
const MOJIBAKE_PATTERN = new RegExp(
  '[\\u00C2-\\u00F4][\\u00A0-\\u00BF' +
    [...CP1252_HIGH_REVERSE.keys()]
      .map((code) => '\\u' + code.toString(16).padStart(4, '0'))
      .join('') +
    ']',
)

/**
 * Reverses accidental double-encoding. Returns null when the text is clean or when the
 * round-trip would not produce valid UTF-8 — never guesses.
 */
export function repairMojibake(text: string): string | null {
  if (!MOJIBAKE_PATTERN.test(text)) return null

  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    const mapped = code > 0xff ? CP1252_HIGH_REVERSE.get(code) : code
    if (mapped === undefined) return null
    bytes[i] = mapped
  }

  try {
    const fixed = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return fixed === text ? null : fixed
  } catch {
    return null
  }
}

/**
 * Spreadsheet exports are routinely windows-1252 rather than UTF-8 — reading those bytes as
 * UTF-8 corrupts names like "Scáthach-Skaði". Strict UTF-8 first, cp1252 as the fallback.
 */
export function decodeCsvBytes(bytes: Uint8Array): {
  text: string
  encoding: 'utf-8' | 'windows-1252'
} {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return { text: stripBom(text), encoding: 'utf-8' }
  } catch {
    const text = new TextDecoder('windows-1252').decode(bytes)
    return { text: stripBom(text), encoding: 'windows-1252' }
  }
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function toBytes(input: ArrayBuffer | Uint8Array | string): Uint8Array | null {
  if (typeof input === 'string') return null
  return input instanceof Uint8Array ? input : new Uint8Array(input)
}

function parseIntStrict(raw: string): number | null {
  const trimmed = raw.trim()
  if (!/^-?\d+$/.test(trimmed)) return null
  return Number.parseInt(trimmed, 10)
}

export function parseCatalog(input: ArrayBuffer | Uint8Array | string): CatalogParseResult {
  const errors: string[] = []
  const warnings: string[] = []
  const repairedCells: RepairedCell[] = []

  const bytes = toBytes(input)
  const decoded = bytes ? decodeCsvBytes(bytes) : { text: stripBom(input as string), encoding: 'utf-8' as const }

  if (decoded.encoding === 'windows-1252') {
    warnings.push('File was not valid UTF-8; decoded as windows-1252 (typical of a spreadsheet export).')
  }

  const parsed = Papa.parse<Record<string, string>>(decoded.text, {
    header: true,
    skipEmptyLines: 'greedy',
  })

  for (const err of parsed.errors) {
    // Papaparse row indexes are 0-based and already exclude the header.
    const row = typeof err.row === 'number' ? err.row + 1 : undefined
    errors.push(`CSV parse error${row ? ` in row ${row}` : ''}: ${err.message}`)
  }

  const headers = parsed.meta.fields ?? []
  const missingRequired = REQUIRED_COLUMNS.filter((c) => !headers.includes(c))
  if (missingRequired.length) {
    errors.push(`Missing required column(s): ${missingRequired.join(', ')}.`)
  }

  const missingOptional = KNOWN_COLUMNS.filter(
    (c) => !headers.includes(c) && !missingRequired.includes(c as (typeof REQUIRED_COLUMNS)[number]),
  )
  if (missingOptional.length) {
    warnings.push(`Column(s) not present, treated as blank: ${missingOptional.join(', ')}.`)
  }

  const unknown = headers.filter((h) => h && !KNOWN_COLUMNS.includes(h as (typeof KNOWN_COLUMNS)[number]))
  if (unknown.length) {
    warnings.push(`Ignored unrecognized column(s): ${unknown.join(', ')}.`)
  }

  if (errors.length) return { units: [], errors, warnings, encoding: decoded.encoding, repairedCells }

  const units: Unit[] = []
  const seenIds = new Map<number, string>()

  parsed.data.forEach((raw, index) => {
    const row = index + 1
    const cell = (column: string): string => {
      const value = (raw[column] ?? '').trim()
      if (!value) return ''
      const fixed = repairMojibake(value)
      if (fixed === null) return value
      repairedCells.push({ row, column, before: value, after: fixed })
      return fixed
    }

    const name = cell('Name')
    const id = parseIntStrict(raw.ID ?? '')
    if (id === null || id <= 0) {
      errors.push(`Row ${row}: ID must be a positive whole number (got "${(raw.ID ?? '').trim()}").`)
      return
    }
    if (seenIds.has(id)) {
      errors.push(`Row ${row}: duplicate ID ${id}, already used by "${seenIds.get(id)}".`)
      return
    }
    if (!name) {
      errors.push(`Row ${row}: Name is required.`)
      return
    }
    seenIds.set(id, name)

    const bannerId = parseIntStrict(raw.Banner ?? '')
    if (bannerId === null || bannerId < 1) {
      errors.push(`Row ${row} ("${name}"): Banner must be a whole number of 1 or more.`)
      return
    }

    const rarity = parseIntStrict(raw.Rarity ?? '')
    if (rarity === null || rarity < 3 || rarity > 5) {
      errors.push(`Row ${row} ("${name}"): Rarity must be 3, 4 or 5 (got "${(raw.Rarity ?? '').trim()}").`)
      return
    }

    const rawHp = (raw.HP ?? '').trim()
    const hp = parseIntStrict(rawHp)
    if (rawHp && hp === null) {
      warnings.push(`Row ${row} ("${name}"): HP "${rawHp}" is not a whole number, recorded as 0.`)
    }

    const saveMods = ABILITIES.reduce((acc, ability) => {
      acc[ability] = cell(`Save${ability}`)
      return acc
    }, {} as SaveMods)

    const saveProficient: string[] = []
    // The column mixes separators across rows ("DEX", "DEX;WIS", and "/" or "," elsewhere).
    for (const token of cell('SaveProficient').split(/[/,;&]|\band\b/i)) {
      const ability = token.trim().toUpperCase()
      if (!ability) continue
      if ((ABILITIES as readonly string[]).includes(ability)) saveProficient.push(ability)
      else warnings.push(`Row ${row} ("${name}"): unrecognized SaveProficient value "${token.trim()}".`)
    }

    units.push({
      id,
      name,
      game: cell('Game'),
      role: cell('Type'),
      bannerId,
      rarity,
      hp: hp ?? 0,
      hpFormula: cell('HPFormula'),
      ac: cell('AC'),
      attackBonus: cell('AttackBonus'),
      attackKind: cell('AttackKind'),
      attackAbility: cell('AttackAbility'),
      attackRange: cell('AttackRange'),
      attackTargets: cell('AttackTargets'),
      damage: cell('Damage'),
      damageType: cell('DamageType'),
      bonusDamage: cell('BonusDamage'),
      bonusDamageType: cell('BonusDamageType'),
      speed: cell('Speed'),
      saves: cell('Saves'),
      saveMods,
      saveProficient,
      attack: cell('Attack'),
      baselineName: cell('BaselineName'),
      baselineText: cell('BaselineText'),
      healing: cell('Healing'),
      special: cell('Special'),
      capstoneType: cell('CapstoneType'),
      capstoneText: cell('CapstoneText'),
      imageUrl: cell('ImageURL'),
    })
  })

  if (!errors.length && !units.length) {
    errors.push('No character rows found in the file.')
  }

  return {
    units: errors.length ? [] : units.sort((a, b) => a.id - b.id),
    errors,
    warnings,
    encoding: decoded.encoding,
    repairedCells,
  }
}

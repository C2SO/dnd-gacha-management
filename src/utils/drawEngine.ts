import type { Unit } from '../types'
// Explicit .ts extension so this module can also be imported directly by Node (which, unlike
// Vite, will not infer the extension) for statistical checks on the draw distribution.
import { rollDie } from './random.ts'

/**
 * Pure draw logic — no Vue, no storage, no DOM. Everything the summon screen does routes
 * through here so the rules live in one testable place.
 *
 * Even Odds rules: a draw is a single fair die with one face per asset still in the pool.
 * Rarity is descriptive only — a 5★ is exactly as likely as a 3★. There is no weighting to
 * configure, and consequently no tier to fall back from when one runs out.
 */

export interface DrawResult {
  unit: Unit
  /** Face rolled on the pool die. */
  roll: number
  /** Number of faces on that die, i.e. how many assets were up for grabs. */
  poolSize: number
}

export interface SummonOutcome {
  results: DrawResult[]
  /** True when the pool ran dry before `count` draws were made. */
  exhausted: boolean
}

export const RARITIES = [3, 4, 5] as const
export const MIN_PULLS = 1
export const MAX_PULLS = 5

/** Every asset still summonable on a banner: right banner, not already claimed, not retired. */
export function availableUnits(
  catalog: readonly Unit[],
  bannerId: number,
  takenIds: ReadonlySet<number>,
): Unit[] {
  return catalog.filter((u) => u.bannerId === bannerId && !u.retired && !takenIds.has(u.id))
}

export function availableByRarity(
  catalog: readonly Unit[],
  bannerId: number,
  takenIds: ReadonlySet<number>,
): Record<number, number> {
  const counts: Record<number, number> = { 3: 0, 4: 0, 5: 0 }
  for (const unit of availableUnits(catalog, bannerId, takenIds)) {
    counts[unit.rarity] = (counts[unit.rarity] ?? 0) + 1
  }
  return counts
}

/**
 * One draw. The roll is the actual selection mechanism rather than decoration: face N of a
 * d(poolSize) takes the Nth remaining asset, so the number shown on screen is exactly what
 * decided the result.
 */
export function drawOne(
  catalog: readonly Unit[],
  bannerId: number,
  takenIds: ReadonlySet<number>,
): DrawResult | null {
  const pool = availableUnits(catalog, bannerId, takenIds)
  if (!pool.length) return null

  const roll = rollDie(pool.length)
  return { unit: pool[roll - 1], roll, poolSize: pool.length }
}

/**
 * `count` draws in one go (1-5). Each result is reserved before the next roll, so a single
 * batch can never hand out the same asset twice — and the die shrinks by one each time.
 */
export function summonMany(
  catalog: readonly Unit[],
  bannerId: number,
  takenIds: ReadonlySet<number>,
  count: number,
): SummonOutcome {
  const reserved = new Set(takenIds)
  const results: DrawResult[] = []
  const draws = Math.max(MIN_PULLS, Math.min(MAX_PULLS, Math.floor(count)))

  for (let i = 0; i < draws; i++) {
    const result = drawOne(catalog, bannerId, reserved)
    if (!result) return { results, exhausted: true }
    reserved.add(result.unit.id)
    results.push(result)
  }
  return { results, exhausted: false }
}

/** Classes not yet assigned to any contender. */
export function availableClasses(
  all: readonly string[],
  players: readonly { className: string | null }[],
): string[] {
  const taken = new Set(players.map((p) => p.className).filter((c): c is string => !!c))
  return all.filter((c) => !taken.has(c))
}

/** One class draw. Returns null when every class is spoken for. */
export function drawClassFrom(pool: readonly string[]): string | null {
  return pool.length ? pool[rollDie(pool.length) - 1] : null
}

import type { Banner, Unit } from '../types'
import { pick, rollD100 } from './random'

/**
 * Pure draw logic — no Vue, no storage, no DOM. Everything the summon screen does routes
 * through here so the rules live in one testable place.
 */

export interface DrawResult {
  unit: Unit
  /** The d100 that was rolled. */
  roll: number
  /** Rarity the roll called for. */
  rolledTier: number
  /** Rarity actually awarded — differs from `rolledTier` only when that tier was empty. */
  tier: number
}

export interface SummonOutcome {
  results: DrawResult[]
  /** True when the banner ran dry before `count` draws were made. */
  exhausted: boolean
}

export const RARITIES = [3, 4, 5] as const
export const MIN_PULLS = 1
export const MAX_PULLS = 5

export function tierForRoll(roll: number, banner: Banner): number {
  if (roll <= banner.t3) return 3
  if (roll <= banner.t4) return 4
  return 5
}

/** Odds of each rarity on a banner, as whole percentages of the d100. */
export function bannerOdds(banner: Banner): Record<number, number> {
  return {
    3: banner.t3,
    4: banner.t4 - banner.t3,
    5: 100 - banner.t4,
  }
}

/** Every unit still summonable on a banner: right banner, not already claimed, not retired. */
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
 * When the rolled rarity has nothing left, step outward rather than failing the draw:
 * down first (a 5★ roll on an empty 5★ pool pays out a 4★), then up.
 */
function tierFallbackOrder(tier: number): number[] {
  return [tier, tier - 1, tier - 2, tier + 1, tier + 2].filter((t) => t >= 3 && t <= 5)
}

/** One draw. Returns null only when the whole banner is empty. */
export function drawOne(
  catalog: readonly Unit[],
  banner: Banner,
  takenIds: ReadonlySet<number>,
): DrawResult | null {
  const roll = rollD100()
  const rolledTier = tierForRoll(roll, banner)
  const pool = availableUnits(catalog, banner.id, takenIds)

  for (const tier of tierFallbackOrder(rolledTier)) {
    const candidates = pool.filter((u) => u.rarity === tier)
    if (candidates.length) {
      return { unit: pick(candidates), roll, rolledTier, tier }
    }
  }
  return null
}

/**
 * `count` draws in one go (1-5). Each result is reserved before the next roll, so a single
 * batch can never hand out the same unit twice.
 */
export function summonMany(
  catalog: readonly Unit[],
  banner: Banner,
  takenIds: ReadonlySet<number>,
  count: number,
): SummonOutcome {
  const reserved = new Set(takenIds)
  const results: DrawResult[] = []
  const draws = Math.max(MIN_PULLS, Math.min(MAX_PULLS, Math.floor(count)))

  for (let i = 0; i < draws; i++) {
    const result = drawOne(catalog, banner, reserved)
    if (!result) return { results, exhausted: true }
    reserved.add(result.unit.id)
    results.push(result)
  }
  return { results, exhausted: false }
}

/** Classes not yet assigned to any player. */
export function availableClasses(all: readonly string[], players: readonly { className: string | null }[]): string[] {
  const taken = new Set(players.map((p) => p.className).filter((c): c is string => !!c))
  return all.filter((c) => !taken.has(c))
}

/** One class draw. Returns null when every class is spoken for. */
export function drawClassFrom(pool: readonly string[]): string | null {
  return pool.length ? pick(pool) : null
}

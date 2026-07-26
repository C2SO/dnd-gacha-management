import type { Unit } from '../types'

/**
 * Formatting shared by every place an asset's sheet is rendered — the result card grid and the
 * detail modal. Kept out of the components so the two can never drift apart.
 */

export interface AbilityBlock {
  label: string
  /** Ability name pulled off the front of the text, e.g. "Bloom of Life (Recharge 5-6)". */
  head: string
  body: string
  /** Capstones (Ultimate/Passive) get emphasized treatment. */
  feature?: boolean
}

/** Mechanical line assembled from the decomposed CSV columns. */
export function attackProfile(unit: Unit): string {
  return [unit.attackKind, unit.attackAbility, unit.attackRange, unit.attackTargets]
    .filter(Boolean)
    .join(' · ')
}

export function damageLine(unit: Unit): string {
  const parts: string[] = []
  if (unit.damage) parts.push([unit.damage, unit.damageType].filter(Boolean).join(' '))
  if (unit.bonusDamage) {
    parts.push(`+ ${[unit.bonusDamage, unit.bonusDamageType].filter(Boolean).join(' ')}`)
  }
  return parts.join(' ')
}

/** Splits "Name (Recharge 5-6): text" so the ability name can be emphasized. */
export function splitAbility(text: string): { head: string; body: string } {
  const match = /^([^:]{2,90}?):\s*([\s\S]+)$/.exec(text.trim())
  return match ? { head: match[1].trim(), body: match[2].trim() } : { head: '', body: text.trim() }
}

/** Every non-empty ability block, in reading order. Empty CSV columns are simply skipped. */
export function abilityBlocks(unit: Unit): AbilityBlock[] {
  const out: AbilityBlock[] = []

  if (unit.attack) out.push({ label: 'Attack', ...splitAbility(unit.attack) })
  if (unit.baselineText) {
    out.push({ label: unit.baselineName || 'Baseline', head: '', body: unit.baselineText })
  }
  if (unit.healing) out.push({ label: 'Healing', ...splitAbility(unit.healing) })
  if (unit.special) out.push({ label: 'Special', ...splitAbility(unit.special) })
  if (unit.capstoneText) {
    out.push({ label: unit.capstoneType || 'Capstone', ...splitAbility(unit.capstoneText), feature: true })
  }
  return out
}

export function monogramFor(unit: Unit): string {
  return unit.name.trim().charAt(0).toUpperCase() || '?'
}

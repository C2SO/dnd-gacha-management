/**
 * Uses crypto.getRandomValues where available so a table of players watching the same screen
 * gets draws that are actually unpredictable, with a Math.random fallback for odd environments.
 */
function randomFloat(): number {
  const crypto = globalThis.crypto
  if (crypto?.getRandomValues) {
    const buffer = new Uint32Array(1)
    crypto.getRandomValues(buffer)
    return buffer[0] / 2 ** 32
  }
  return Math.random()
}

/** Uniform integer in [1, sides]. */
export function rollDie(sides: number): number {
  return Math.floor(randomFloat() * sides) + 1
}

export function rollD100(): number {
  return rollDie(100)
}

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(randomFloat() * items.length)]
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(randomFloat() * 1e6).toString(36)}`
}

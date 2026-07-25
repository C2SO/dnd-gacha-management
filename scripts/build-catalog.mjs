#!/usr/bin/env node
/**
 * Turns `data/characters.csv` into `src/data/catalog.generated.json`.
 *
 * Runs automatically before every build (see the `prebuild` script), so editing the CSV and
 * pushing is all it takes to update the deployed site. Any validation error fails the build
 * loudly rather than shipping a broken catalog.
 *
 * Imports the app's own TypeScript parser directly — Node strips the types — so the build and
 * the in-app CSV import can never disagree about what a valid file looks like.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseCatalog } from '../src/data/parseCatalog.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(root, 'data/characters.csv')
const target = resolve(root, 'src/data/catalog.generated.json')

const result = parseCatalog(readFileSync(source))

for (const warning of result.warnings) console.warn(`  warning  ${warning}`)
for (const cell of result.repairedCells) {
  console.warn(`  repaired  row ${cell.row} ${cell.column}: "${cell.before}" -> "${cell.after}"`)
}

if (result.errors.length) {
  console.error(`\n${result.errors.length} error(s) in data/characters.csv:`)
  for (const error of result.errors) console.error(`  - ${error}`)
  console.error('\nCatalog not written.')
  process.exit(1)
}

writeFileSync(target, `${JSON.stringify(result.units, null, 2)}\n`)

const byBanner = new Map()
for (const unit of result.units) {
  const key = `banner ${unit.bannerId}`
  const tally = byBanner.get(key) ?? { 3: 0, 4: 0, 5: 0 }
  tally[unit.rarity]++
  byBanner.set(key, tally)
}

console.log(`Wrote ${result.units.length} units to src/data/catalog.generated.json (${result.encoding})`)
for (const [banner, tally] of [...byBanner].sort()) {
  console.log(`  ${banner}: ${tally[3]}x3*  ${tally[4]}x4*  ${tally[5]}x5*`)
}

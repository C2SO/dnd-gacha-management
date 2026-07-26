import type { SessionFile } from '../types'
import { SESSION_FORMAT, SESSION_VERSION } from '../types'
import { looksLikeSession, migrate } from './useSession'
import { parseCatalog, type CatalogParseResult } from '../data/parseCatalog'

/** Browser-side file plumbing for the Session tab. Kept out of components so views stay thin. */

export interface JsonImportResult {
  ok: boolean
  session?: SessionFile
  errors: string[]
  warnings: string[]
}

function timestampForFilename(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
}

export function downloadSession(state: SessionFile) {
  const payload: SessionFile = {
    ...JSON.parse(JSON.stringify(state)),
    format: SESSION_FORMAT,
    version: SESSION_VERSION,
    savedAt: new Date().toISOString(),
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `dnd-gacha-${timestampForFilename()}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('The file could not be read.'))
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.readAsText(file)
  })
}

/**
 * Read as bytes, not text: the CSV parser does its own encoding detection because spreadsheet
 * exports are frequently windows-1252, which FileReader.readAsText would mangle.
 */
export function readFileAsBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('The file could not be read.'))
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.readAsArrayBuffer(file)
  })
}

export function importSessionJson(text: string): JsonImportResult {
  const warnings: string[] = []
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['That file is not valid JSON.'], warnings }
  }

  if (!looksLikeSession(parsed)) {
    return {
      ok: false,
      errors: ['That JSON is not a session file — expected players, draws and settings.'],
      warnings,
    }
  }

  const candidate = parsed as SessionFile
  if (candidate.format && candidate.format !== SESSION_FORMAT) {
    return { ok: false, errors: [`Unrecognized file format "${candidate.format}".`], warnings }
  }
  if (typeof candidate.version === 'number' && candidate.version > SESSION_VERSION) {
    warnings.push(
      `File was written by a newer version (v${candidate.version}); loading it anyway, some fields may be ignored.`,
    )
  }
  if (!candidate.catalog?.length) {
    warnings.push('File contained no characters; the built-in catalog was used instead.')
  }

  const session = migrate(candidate)

  const knownPlayerIds = new Set(session.players.map((p) => p.id))
  const orphans = session.draws.filter((d) => !knownPlayerIds.has(d.playerId)).length
  if (orphans) warnings.push(`${orphans} draw(s) reference a player that is not in the file.`)

  return { ok: true, session, errors: [], warnings }
}

export async function importCatalogCsv(file: File): Promise<CatalogParseResult> {
  return parseCatalog(await readFileAsBytes(file))
}

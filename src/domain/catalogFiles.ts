/// <reference types="vite/client" />
import { parseMsolfa } from './parser'
import { scoreToEditModel } from './editModel'
import { editModelToText } from './serialize'

// Single source of the catalog location (see catalog/README.md).
// catalog/*.msolfa = repertoire, catalog/_drafts/*.msolfa = to fix.
export const CATALOG_RAW = import.meta.glob(['/catalog/*.msolfa', '/catalog/_drafts/*.msolfa'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/** Text normalised through the editor model, so formatting differences do not matter. */
export function normalizedText(text: string): string | null {
  const r = parseMsolfa(text)
  return r.success ? editModelToText(scoreToEditModel(r.file)) : null
}

/** Catalog path of the bundled file that holds exactly this score, if any. */
export function catalogPathFor(normalized: string): string | null {
  return Object.entries(CATALOG_RAW).find(([, t]) => normalizedText(t) === normalized)?.[0] ?? null
}

/** État partagé CLI ↔ serveur MCP : quelles sources ont déjà été traitées (clé = hash du contenu). */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { ROOT } from './pipeline'

export const STATE_FILE = path.join(ROOT, 'tools/msolfa-ingest/.state.json')
export type State = Record<string, { output?: string; status: string; date: string; source?: string }>

export const loadState = (): State => { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) } catch { return {} } }
export const saveState = (s: State) => fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2))
export const hashFiles = (files: string[], hint = '') => {
  const h = crypto.createHash('sha256')
  for (const f of files) h.update(fs.readFileSync(f))
  return h.update(hint).digest('hex').slice(0, 20)
}

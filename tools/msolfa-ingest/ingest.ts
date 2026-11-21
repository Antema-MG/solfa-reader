#!/usr/bin/env tsx
/**
 * Convertit des partitions solfa (image / PDF) en .msolfa et les range dans catalog/.
 *
 *   npm run msolfa:ingest -- solfa/133.pdf
 *   npm run msolfa:ingest -- solfa/                       # tout un dossier (récursif)
 *   npm run msolfa:ingest -- --group p1.jpg p2.jpg        # plusieurs pages = 1 chant
 *
 * Variables : ANTHROPIC_API_KEY (obligatoire), MSOLFA_MODEL (défaut claude-sonnet-5-5).
 */
import fs from 'node:fs'
import path from 'node:path'
import {
  ROOT, buildSystemPrompt, isSupported, makeAnthropicCall, processSong,
  type Options, type SongResult, type Usage,
} from './pipeline'
import { loadState, saveState, hashFiles } from './state'

const USAGE = `Usage : ingest [options] <fichier|dossier>...

  --out <dir>          dossier du catalogue          (défaut : catalog)
  --drafts <dir>       dossier des brouillons         (défaut : catalog/_drafts)
  --group              tous les fichiers donnés = pages d'un seul chant
  --hint "<texte>"     indice pour le modèle (ex. "chant n°205 uniquement", "Key: G")
  --retries <n>        corrections après rejet du parseur   (défaut : 3)
  --no-verify          saute la passe de relecture (2x moins cher, moins fiable)
  --lean               n'annexe pas la convention complète au prompt (moins cher)
  --concurrency <n>    chants traités en parallèle           (défaut : 2)
  --model <id>         modèle (ou MSOLFA_MODEL)
  --force              retraite les fichiers déjà faits / écrase au lieu de suffixer -v2
  --dry-run            liste les entrées, n'appelle pas l'API
  --print-prompt       affiche le prompt système complet puis quitte
`

function parseArgs(argv: string[]) {
  const o = {
    out: 'catalog', drafts: 'catalog/_drafts', group: false, hint: '', retries: 3, verify: true, lean: false,
    concurrency: 2, model: process.env.MSOLFA_MODEL ?? 'claude-sonnet-5-5', force: false, dryRun: false,
    printPrompt: false, inputs: [] as string[],
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const val = () => argv[++i] ?? (() => { throw new Error(`${a} attend une valeur`) })()
    if (a === '--out') o.out = val()
    else if (a === '--drafts') o.drafts = val()
    else if (a === '--group') o.group = true
    else if (a === '--hint') o.hint = val()
    else if (a === '--retries') o.retries = Number(val())
    else if (a === '--no-verify') o.verify = false
    else if (a === '--lean') o.lean = true
    else if (a === '--concurrency') o.concurrency = Math.max(1, Number(val()))
    else if (a === '--model') o.model = val()
    else if (a === '--force') o.force = true
    else if (a === '--dry-run') o.dryRun = true
    else if (a === '--print-prompt') o.printPrompt = true
    else if (a === '-h' || a === '--help') { console.log(USAGE); process.exit(0) }
    else if (a.startsWith('--')) throw new Error(`option inconnue : ${a}\n${USAGE}`)
    else o.inputs.push(a)
  }
  return o
}

function collect(inputs: string[]): string[] {
  const out: string[] = []
  const walk = (p: string) => {
    const st = fs.statSync(p)
    if (st.isDirectory()) {
      for (const n of fs.readdirSync(p).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) walk(path.join(p, n))
    } else if (isSupported(p)) out.push(p)
  }
  for (const i of inputs) walk(i)
  return out
}

async function main() {
  const a = parseArgs(process.argv.slice(2))
  if (a.printPrompt) { console.log(buildSystemPrompt(a.lean)); return }
  if (!a.inputs.length) { console.log(USAGE); process.exit(1) }

  const files = collect(a.inputs)
  if (!files.length) throw new Error('Aucun fichier image/PDF trouvé.')
  const jobs: string[][] = a.group ? [files] : files.map(f => [f])

  const opts: Options = {
    outDir: path.resolve(ROOT, a.out), draftsDir: path.resolve(ROOT, a.drafts),
    retries: a.retries, verify: a.verify, force: a.force, lean: a.lean, hint: a.hint, dryRun: a.dryRun,
  }

  const state = loadState()
  const todo = jobs.filter(j => a.force || !state[hashFiles(j, a.hint)])
  console.log(`${jobs.length} chant(s), ${jobs.length - todo.length} déjà traité(s), ${todo.length} à faire · modèle ${a.model}`)
  if (a.dryRun) { todo.forEach(j => console.log('  ·', j.map(f => path.relative(ROOT, f)).join(' + '))); return }
  if (!todo.length) return

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY manquante (export ANTHROPIC_API_KEY=sk-ant-...)')
  const call = makeAnthropicCall(a.model, key)
  const system = buildSystemPrompt(a.lean)

  const total: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
  const results: SongResult[] = []
  let next = 0, done = 0

  const worker = async () => {
    while (next < todo.length) {
      const job = todo[next++]
      const label = job.map(f => path.basename(f)).join(' + ')
      const logs: string[] = []
      let r: SongResult
      try {
        r = await processSong(job, opts, call, system, s => logs.push(s))
      } catch (e) {
        r = {
          inputs: job, status: 'failed', measures: 0, issues: [], corrections: 0, verified: false,
          report: { numero: '-', recueil: '-', confiance: '-', approximations: [], incertitudes: [] },
          usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, error: (e as Error).message,
        }
      }
      results.push(r)
      for (const k of Object.keys(total) as (keyof Usage)[]) total[k] += r.usage[k]
      const warn = r.issues.filter(i => i.level === 'warning').length
      const icon = r.status === 'ok' ? '✓' : r.status === 'draft' ? '△' : '✗'
      console.log(`[${++done}/${todo.length}] ${icon} ${label}` +
        (r.output ? ` → ${r.output}` : '') +
        (r.status !== 'failed' ? ` · ${r.measures} mes. · confiance ${r.report.confiance}` +
          (warn ? ` · ${warn} avert.` : '') + (r.corrections ? ` · ${r.corrections} correction(s)` : '') : ` · ${r.error}`))
      logs.forEach(l => console.log(l))
      if (r.status !== 'failed') {
        state[hashFiles(job, a.hint)] = { output: r.output, status: r.status, date: new Date().toISOString() }
        saveState(state)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(a.concurrency, todo.length) }, worker))

  const n = (s: string) => results.filter(r => r.status === s).length
  console.log(`\nTerminé : ${n('ok')} OK dans ${a.out}, ${n('draft')} brouillon(s) dans ${a.drafts}, ${n('failed')} échec(s).`)
  console.log(`Tokens : ${total.input} entrée, ${total.cacheRead} lus du cache, ${total.cacheWrite} écrits au cache, ${total.output} sortie.`)
  const unsure = results.filter(r => r.status === 'ok' && (r.report.confiance !== 'haute' || r.report.incertitudes.length))
  if (unsure.length) {
    console.log(`\nÀ relire en priorité (confiance < haute ou incertitudes) :`)
    unsure.forEach(r => console.log(`  - ${r.output} (${r.report.confiance}, ${r.report.incertitudes.length} point(s) à vérifier)`))
  }
  fs.writeFileSync(path.join(ROOT, 'tools/msolfa-ingest/last-run.json'), JSON.stringify(results, null, 2))
}

main().catch(e => { console.error('Erreur :', e.message); process.exit(1) })

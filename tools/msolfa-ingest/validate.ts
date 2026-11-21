#!/usr/bin/env tsx
/**
 * Valide les .msolfa du catalogue avec le parseur de l'app + les contrôles supplémentaires.
 *
 *   npm run msolfa:validate                    # catalog/ et catalog/_drafts/
 *   npm run msolfa:validate -- catalog/x.msolfa
 *   npm run msolfa:validate -- --move          # range : KO de catalog/ → _drafts/, OK de _drafts/ → catalog/
 *
 * Code de sortie 1 si au moins un fichier de catalog/ est invalide (utilisable en CI).
 */
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from './pipeline'
import { lintMsolfa, formatIssues } from './lint'

const args = process.argv.slice(2)
const move = args.includes('--move')
const verbose = args.includes('--verbose')
const targets = args.filter(a => !a.startsWith('--'))

const catalog = path.join(ROOT, 'catalog')
const drafts = path.join(catalog, '_drafts')
const list = (d: string) => fs.existsSync(d)
  ? fs.readdirSync(d).filter(f => f.endsWith('.msolfa')).map(f => path.join(d, f)) : []
const files = targets.length ? targets.map(t => path.resolve(t)) : [...list(catalog), ...list(drafts)]

let badInCatalog = 0, moved = 0
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8')
  const r = lintMsolfa(text)
  const inDrafts = path.dirname(f) === drafts
  const rel = path.relative(ROOT, f)
  const warn = r.issues.filter(i => i.level === 'warning').length
  const err = r.issues.filter(i => i.level === 'error').length
  console.log(`${r.ok ? 'OK ' : 'KO '} ${rel}${r.ok ? ` · ${r.measures} mes.${warn ? ` · ${warn} avert.` : ''}` : ` · ${err} erreur(s)`}`)
  if (!r.ok || verbose) console.log(formatIssues(text, r.issues))
  if (!r.ok && !inDrafts) badInCatalog++
  if (move && path.dirname(f) === (r.ok ? drafts : catalog)) {
    const dest = path.join(r.ok ? catalog : drafts, path.basename(f))
    if (fs.existsSync(dest)) { console.log(`   ! ${path.relative(ROOT, dest)} existe déjà, non déplacé`); continue }
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.renameSync(f, dest); moved++
    console.log(`   → déplacé vers ${path.relative(ROOT, dest)}`)
  }
}
console.log(`\n${files.length} fichier(s)${move ? `, ${moved} déplacé(s)` : ''}.`)
process.exit(badInCatalog && !move ? 1 : 0)

#!/usr/bin/env tsx
/**
 * Conversion déterministe des PDF solfa.mg (couche texte) → .msolfa, sans API.
 *   npm run msolfa:convert -- solfa/ff/ff1.pdf [--out /chemin] [--print]
 */
import fs from 'node:fs'
import path from 'node:path'
import { convertPdf } from './layout'
import { lintMsolfa, formatIssues } from './lint'

const args = process.argv.slice(2)
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : ''
const files = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--out')
for (const f of files) {
  const r = convertPdf(f)
  const lint = lintMsolfa(r.text)
  console.log(`\n=== ${path.basename(f)} · n°${r.numero} · ${r.title} · ${r.measures} mes. (${r.meterN} temps) · ${lint.ok ? 'OK' : 'KO'}`)
  r.diagnostics.forEach(d => console.log(`  [${d.level}] ${d.msg}`))
  if (lint.issues.length) console.log(formatIssues(r.text, lint.issues, 10))
  if (out) { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, path.basename(f, '.pdf') + '.msolfa'), r.text) }
  if (args.includes('--print')) console.log(r.text)
}

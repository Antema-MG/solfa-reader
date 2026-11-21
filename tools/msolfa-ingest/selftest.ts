/**
 * Autotest sans clé API : un faux modèle renvoie d'abord un fichier invalide, puis le corrige.
 * Vérifie : extraction des balises, boucle de correction, relecture, routage catalog/_drafts, nom de fichier.
 *   npm run msolfa:selftest
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { processSong, pickFileName, slugify, buildSystemPrompt, type ModelCall, type Options } from './pipeline'
import { lintMsolfa } from './lint'

const GOOD = `Key: C
Mesure: 4/4
Titre: Exemple
Tempo: 80 BPM

// Phrase 1
S. || 0 : 0 : 0 : s | d' : t : l : s | f : m : r : - ||
A. || 0 : 0 : 0 : m | m : r : f : m | d : d : t, : - ||
T. || 0 : 0 : 0 : d | d' : s : s : s | l : s : s : - ||
B. || 0 : 0 : 0 : d | d : s, : f, : s, | d : d : s, : - ||
W.  Je-so-sy Mpa-mon-jy ra-ha
`
const BAD = GOOD.replace('d\' : t : l : s', "d' : t : l")           // mesure à 3 temps
const reply = (m: string) =>
  `<analyse>ok</analyse>\n<msolfa>\n${m}</msolfa>\n<rapport>\nnumero: 12\nrecueil: ff\nconfiance: haute\napproximations:\n- aucune\nincertitudes:\n- mesure 2 : s ou l ?\n</rapport>`

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'msolfa-'))
const img = path.join(tmp, '12.png')
fs.writeFileSync(img, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'))
const opts: Options = {
  outDir: path.join(tmp, 'catalog'), draftsDir: path.join(tmp, 'catalog/_drafts'),
  retries: 2, verify: true, force: false, lean: true, hint: '', dryRun: false,
}
const usage = { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 }

async function main() {
  // 1. le fichier de référence est valide
  assert.ok(lintMsolfa(GOOD).ok, 'GOOD doit être valide')
  assert.ok(!lintMsolfa(BAD).ok, 'BAD doit être rejeté')

  // 2. mauvais puis bon puis relecture
  let n = 0
  const seen: string[] = []
  const call: ModelCall = async (_s, msgs) => {
    n++
    seen.push(typeof msgs[msgs.length - 1].content === 'string' ? (msgs[msgs.length - 1].content as string).slice(0, 40) : '(blocs)')
    return { text: n === 1 ? reply(BAD) : reply(GOOD), usage }
  }
  const r = await processSong([img], opts, call, buildSystemPrompt(true))
  assert.equal(r.status, 'ok'); assert.equal(r.corrections, 1); assert.ok(r.verified)
  assert.equal(n, 3, 'mauvais → correction → relecture')
  assert.match(r.output!, /catalog\/ff12-exemple\.msolfa$|catalog\\ff12-exemple\.msolfa$/)
  const written = fs.readFileSync(path.join(tmp, 'catalog/ff12-exemple.msolfa'), 'utf8')
  assert.ok(lintMsolfa(written).ok, 'le fichier écrit doit rester valide')
  assert.match(written, /À vérifier : mesure 2/)

  // 3. jamais valide → brouillon
  const call2: ModelCall = async () => ({ text: reply(BAD), usage })
  const r2 = await processSong([img], opts, call2, 'sys')
  assert.equal(r2.status, 'draft'); assert.match(r2.output!, /_drafts/)

  // 4. noms de fichiers
  assert.equal(slugify('Fa zaza no teraka ho antsika (Isaia 9:5)'), 'fa-zaza-no-teraka-ho-antsika')
  assert.equal(pickFileName('Ny teninao rehetra', '205', '-', ['x/205.pdf']), '205-ny-teninao-rehetra')
  assert.equal(pickFileName('Atra fitiavana', '-', '-', ['x/ff48.pdf']), 'ff48-atra-fitiavana')
  console.log('selftest OK (3 appels simulés, brouillon routé, noms de fichiers)')
}
main().catch(e => { console.error(e); process.exit(1) })

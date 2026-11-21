// Run: npx tsx scripts/check-tuples.ts — round-trip of subdivided beats + phrase split/merge.
import assert from 'node:assert/strict'
import { parseMsolfa, parseBeatToken } from '../src/domain/parser'
import { scoreToEditModel, cellFromElements } from '../src/domain/editModel'
import { editModelToText, cellToToken } from '../src/domain/serialize'
import { splitBlock, mergeBlocks } from '../src/domain/editOps'

// token → cell → token must be stable, and durations must sum to 1 beat
for (const tok of ['m', 'm.r', 'm.r.', '.r', '-.s', 'm.r.d', 'm.r.d.s', 'm.r.d.', "m,.r'.d", 'm.-.d', 'm.0.d.s']) {
  const els = parseBeatToken(tok)
  assert.ok(els, `${tok} should parse`)
  assert.ok(Math.abs(els.reduce((s, e) => s + e.dur, 0) - 1) < 1e-9, `${tok} dur sum`)
  const back = cellToToken(cellFromElements(els))
  const again = parseBeatToken(back)
  assert.deepEqual(again, els, `${tok} → ${back} must re-parse identically`)
}
assert.equal(parseBeatToken('m.r.d.s.d'), null)
assert.equal(parseBeatToken('m.x.d'), null)

// whole-score round trip keeps tuples + lyrics, and split/merge keeps lyrics
const src = `Key: C
Mesure: 3/4
Titre: T
Compositeur: -
Tempo: 80 BPM

// Phrase 1
S. || m.r.d : s : - | l.s.f.m : s : - ||
A. || d : d : d | d : d : d ||
T. || s, : s, : s, | s, : s, : s, ||
B. || d, : d, : d, | d, : d, : d, ||
W. A be ce de fe ge
`
const r = parseMsolfa(src); assert.ok(r.success)
const m0 = scoreToEditModel(r.file)
const text = editModelToText(m0)
const r2 = parseMsolfa(text); assert.ok(r2.success, text)
assert.equal(r2.file.events.length, r.file.events.length)

const sp = splitBlock(m0, null, 0, 1)
assert.equal(sp.model.blocks.length, 2)
assert.equal(sp.model.blocks[0].lyrics, 'A be ce de')       // m.r.d + s = 4 sung notes
assert.equal(sp.model.blocks[1].lyrics, 'fe ge')
assert.ok(parseMsolfa(editModelToText(sp.model)).success)
const mg = mergeBlocks(sp.model, null, 0)
assert.equal(mg.model.blocks[0].lyrics, 'A be ce de fe ge')
console.log('check-tuples: ok')

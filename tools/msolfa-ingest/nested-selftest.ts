/**
 * Test des quarts de temps : `m.(r.d)`, `(t,.d).r`, `s.(-.s)`.
 *   npx tsx tools/msolfa-ingest/nested-selftest.ts
 */
import assert from 'node:assert/strict'
import { parseMsolfa, parseBeatToken } from '../../src/domain/parser'
import { scoreToEditModel } from '../../src/domain/editModel'
import { editModelToText } from '../../src/domain/serialize'

const durs = (t: string) => parseBeatToken(t)?.map(e => (e.kind === 'note' ? e.degree + e.octave : e.kind) + ':' + e.dur)

assert.deepEqual(durs('m.(r.d)'), ['m:0.5', 'r:0.25', 'd:0.25'])
assert.deepEqual(durs('(t,.d).r'), ['t,:0.25', 'd:0.25', 'r:0.5'])
assert.deepEqual(durs('s.(-.s)'), ['s:0.5', 'tie:0.25', 's:0.25'])
assert.deepEqual(durs('m . ( r . d )'), ['m:0.5', 'r:0.25', 'd:0.25'])
assert.deepEqual(durs('.(r.d)'), ['rest:0.5', 'r:0.25', 'd:0.25'])
assert.deepEqual(durs('(r.d).(m.f)'), ['r:0.25', 'd:0.25', 'm:0.25', 'f:0.25'])
for (const bad of ['(r.d)', 'm.(r.d', 'm.(r)', 'm.(r.d.f)', 'm.(r.d).s', 'm.r)'])
  assert.equal(parseBeatToken(bad), null, `doit être invalide : ${bad}`)
// les formes existantes ne changent pas
assert.deepEqual(durs('m.r.d')?.length, 3)
assert.deepEqual(durs('s.f'), ['s:0.5', 'f:0.5'])

const src = `Key: G
Mesure: 3/4
S. || m.(r.d) : - : 0 | t,.(d.r) : 0 : .m | s.(-.s) : 0 : 0 ||
A. || d : - : - | s, : 0 : s, | s : 0 : 0 ||
W. Ma ry da ka mi no
`
const r = parseMsolfa(src)
assert.ok(r.success, 'le fichier doit être valide')
if (r.success) {
  const s = r.file.events.filter(e => e.voice === 'S')
  assert.deepEqual(s.map(e => [e.degree, e.start, e.durBeats]), [['m', 0, 0.5], ['r', 0.5, 0.25], ['d', 0.75, 1.25], ['t', 3, 0.5], ['d', 3.5, 0.25], ['r', 3.75, 0.25], ['m', 5.5, 0.5], ['s', 6, 0.75], ['s', 6.75, 0.25]])
  assert.equal(r.file.measures[0].beats.S[0].lyric, 'Ma-ry-da')
  // aller-retour éditeur : le texte re-généré donne les mêmes événements
  const again = parseMsolfa(editModelToText(scoreToEditModel(r.file)))
  assert.ok(again.success)
  if (again.success) assert.deepEqual(again.file.events, r.file.events)
}
console.log('nested-selftest : OK')

import type { EditModel, EditCell, EditSlot, EditNote, Voice } from '../types'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']

function chrom(c: number): string {
  return c === 1 ? 'i' : c === -1 ? 'a' : ''
}

/** A note → its token, always with an EXPLICIT octave modifier (never a trailing
 *  "." which the parser would read as octave-grave — see parser.ts Rule 1). */
function noteToken(n: EditNote): string {
  return n.degree + chrom(n.chromatic) + n.octave
}

function slotToken(s: EditSlot): string {
  if (s.kind === 'note') return noteToken(s)
  if (s.kind === 'tie')  return '-'
  return '' // rest as first half-beat → ".b" form
}

function cellToToken(cell: EditCell): string {
  switch (cell.kind) {
    case 'note': return noteToken(cell)
    case 'tie':  return '-'
    case 'rest': return '0'
    case 'pair': return `${slotToken(cell.a)}.${noteToken(cell.b)}`
  }
}

/** Serialize the edit model back to a complete, re-parseable .msolfa document. */
export function editModelToText(model: EditModel): string {
  const m = model.meta
  const lines: string[] = [
    `Key: ${m.key}`,
    `Mesure: ${m.numerator}/${m.denominator}`,
    `Titre: ${m.title || '-'}`,
    `Compositeur: ${m.composer || '-'}`,
    `Tempo: ${m.tempo} BPM`,
    '',
  ]

  model.blocks.forEach(block => {
    if (block.comment) lines.push(block.comment) // comment already includes "//"
    VOICES.forEach(v => {
      const body = block.measures
        .map(measure => measure.beats[v].map(cellToToken).join(' : '))
        .join(' | ')
      lines.push(`${v}. || ${body} ||`)
    })
    lines.push('')
  })

  return lines.join('\n')
}

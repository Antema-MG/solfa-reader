import type { Score, Beat, Element, Voice, EditCell, EditSlot, EditModel } from '../types'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']

/** One Element → an edit slot (the half-beat building block of a pair). */
function slotFromElement(el: Element): EditSlot {
  if (el.kind === 'note') return { kind: 'note', degree: el.degree, chromatic: el.chromatic, octave: el.octave }
  if (el.kind === 'tie')  return { kind: 'tie' }
  return { kind: 'rest' }
}

/**
 * Collapse a parsed Beat (1–2 Elements) into a single EditCell.
 * Whole-beat note/tie/rest map directly; two half-beat elements become a `pair`.
 * Real .msolfa pairs always end in a note (`a.b`, `-.b`, `.b`); if a rare 2nd
 * element is not a note, we fall back to the first element as a whole-beat cell.
 */
function cellFromBeat(beat: Beat | undefined): EditCell {
  const els = beat?.elements ?? []
  if (els.length >= 2) {
    const b = els[1]
    if (b.kind === 'note') {
      return { kind: 'pair', a: slotFromElement(els[0]), b: { kind: 'note', degree: b.degree, chromatic: b.chromatic, octave: b.octave } }
    }
    // 2nd slot is not a note → keep only the first element's value.
    const a = slotFromElement(els[0])
    return a // EditSlot is a subset of EditCell (note/tie/rest)
  }
  const e = els[0]
  if (!e) return { kind: 'rest' }
  if (e.kind === 'note') return { kind: 'note', degree: e.degree, chromatic: e.chromatic, octave: e.octave }
  if (e.kind === 'tie')  return { kind: 'tie' }
  return { kind: 'rest' }
}

/**
 * Build an editable model from a parsed Score. The parser guarantees every
 * measure has exactly `beatsPerMeasure` beats per voice (absent voices filled
 * with rests), so the grid is rectangular by construction.
 */
export function scoreToEditModel(score: Score): EditModel {
  const num = score.beatsPerMeasure
  return {
    meta: score.metadata,
    numerator: num,
    blocks: score.renderBlocks.map(block => ({
      comment: block.comment,
      measures: block.measures.map(measure => {
        const beats = {} as Record<Voice, EditCell[]>
        VOICES.forEach(v => {
          beats[v] = Array.from({ length: num }, (_, j) => cellFromBeat(measure.beats[v][j]))
        })
        return { beats }
      }),
    })),
  }
}

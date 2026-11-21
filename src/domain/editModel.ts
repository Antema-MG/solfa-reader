import type { Score, Beat, Element, Voice, RenderBlock, EditCell, EditSlot, EditModel } from '../types'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']

/** One Element → an edit slot (the half-beat building block of a pair). */
function slotFromElement(el: Element): EditSlot {
  if (el.kind === 'note') return { kind: 'note', degree: el.degree, chromatic: el.chromatic, octave: el.octave }
  if (el.kind === 'tie')  return { kind: 'tie' }
  return { kind: 'rest' }
}

/**
 * Collapse a beat's Elements into a single EditCell: one element maps directly,
 * 2–4 elements (equal subdivisions) become a `tuple` of as many slots.
 */
export function cellFromElements(els: Element[]): EditCell {
  if (els.length >= 2) {
    const slots = els.slice(0, 4).map(slotFromElement)
    const uneven = els.some(e => Math.abs(e.dur - els[0].dur) > 1e-9)
    return uneven ? { kind: 'tuple', slots, durs: els.slice(0, 4).map(e => e.dur) } : { kind: 'tuple', slots }
  }
  const e = els[0]
  return e ? slotFromElement(e) : { kind: 'rest' }
}

function cellFromBeat(beat: Beat | undefined): EditCell {
  return cellFromElements(beat?.elements ?? [])
}

/** Soprano lyrics of a block, as space-separated syllables ('' = none). */
function blockLyrics(block: RenderBlock): string {
  return block.measures.flatMap(m => m.beats.S.map(b => b.lyric ?? '')).filter(Boolean).join(' ')
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
      lyrics: blockLyrics(block),
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

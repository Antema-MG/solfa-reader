import type { Voice, EditModel, EditCell, EditNote, EditSelection } from '../types'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']

/** A toolbar/keyboard edit, applied to the currently selected cell. */
export type EditAction =
  | { type: 'rhythm'; value: 'note' | 'pair' | 'tie' | 'rest' }
  | { type: 'degree'; value: string }
  | { type: 'accidental'; value: 'sharp' | 'flat' }
  | { type: 'octave'; value: 1 | -1 }

// ── octave string ⇄ signed level ─────────────────────────────
function octaveToLevel(o: string): number {
  if (o.startsWith("'")) return o.length
  if (o.startsWith(',')) return -o.length
  return 0
}
function levelToOctave(n: number): string {
  const c = Math.max(-2, Math.min(2, n))
  return c > 0 ? "'".repeat(c) : c < 0 ? ','.repeat(-c) : ''
}

// ── selection / cell access ──────────────────────────────────
export function cellAt(model: EditModel, sel: EditSelection): EditCell | undefined {
  return model.blocks[sel.block]?.measures[sel.measure]?.beats[sel.voice]?.[sel.beat]
}

/** The note inside a cell that an action targets (respecting the active slot). */
function targetNote(cell: EditCell, slot: 'a' | 'b' | null): EditNote | null {
  if (cell.kind === 'note') return cell
  if (cell.kind === 'pair') {
    if (slot === 'b') return cell.b
    return cell.a.kind === 'note' ? cell.a : null
  }
  return null
}

/** Immutably replace the cell at `sel` with `next`. */
export function withCell(model: EditModel, sel: EditSelection, next: EditCell): EditModel {
  return {
    ...model,
    blocks: model.blocks.map((block, bi) => bi !== sel.block ? block : {
      ...block,
      measures: block.measures.map((measure, mi) => mi !== sel.measure ? measure : {
        ...measure,
        beats: {
          ...measure.beats,
          [sel.voice]: measure.beats[sel.voice].map((c, ci) => ci !== sel.beat ? c : next),
        },
      }),
    }),
  }
}

function replaceNote(cell: EditCell, slot: 'a' | 'b' | null, note: EditNote): EditCell {
  if (cell.kind === 'note') return note
  if (cell.kind === 'pair') return slot === 'b' ? { ...cell, b: note } : { ...cell, a: note }
  return cell
}

/** Pure: apply an edit action to a single cell, returning the new cell. */
export function applyToCell(cell: EditCell, slot: 'a' | 'b' | null, action: EditAction): EditCell {
  switch (action.type) {
    case 'rhythm': {
      const seed: EditNote = targetNote(cell, slot) ?? { kind: 'note', degree: 'd', chromatic: 0, octave: '' }
      if (action.value === 'note') return { ...seed }
      if (action.value === 'tie')  return { kind: 'tie' }
      if (action.value === 'rest') return { kind: 'rest' }
      return { kind: 'pair', a: { ...seed }, b: { ...seed } }
    }
    case 'degree': {
      const setNote = (n: EditNote | null): EditNote =>
        n ? { ...n, degree: action.value } : { kind: 'note', degree: action.value, chromatic: 0, octave: '' }
      if (cell.kind === 'pair') {
        return slot === 'b'
          ? { ...cell, b: setNote(cell.b) }
          : { ...cell, a: setNote(cell.a.kind === 'note' ? cell.a : null) }
      }
      return setNote(cell.kind === 'note' ? cell : null)
    }
    case 'accidental': {
      const n = targetNote(cell, slot)
      if (!n) return cell
      const delta = action.value === 'sharp' ? 1 : -1
      return replaceNote(cell, slot, { ...n, chromatic: n.chromatic === delta ? 0 : delta })
    }
    case 'octave': {
      const n = targetNote(cell, slot)
      if (!n) return cell
      return replaceNote(cell, slot, { ...n, octave: levelToOctave(octaveToLevel(n.octave) + action.value) })
    }
  }
}

/** Pure: the selection reached by moving one step. Steps into a pair's two
 *  eighths before crossing a beat, and wraps across measures/blocks. */
export function nextSelection(model: EditModel, sel: EditSelection, dir: 'left' | 'right' | 'up' | 'down'): EditSelection {
  const num = model.numerator

  if (dir === 'up' || dir === 'down') {
    const ni = Math.max(0, Math.min(3, VOICES.indexOf(sel.voice) + (dir === 'down' ? 1 : -1)))
    const voice = VOICES[ni]
    const cell = model.blocks[sel.block]?.measures[sel.measure]?.beats[voice]?.[sel.beat]
    return { ...sel, voice, slot: cell?.kind === 'pair' ? 'a' : null }
  }

  const cur = cellAt(model, sel)
  if (dir === 'right' && cur?.kind === 'pair' && sel.slot !== 'b') return { ...sel, slot: 'b' }
  if (dir === 'left'  && cur?.kind === 'pair' && sel.slot === 'b') return { ...sel, slot: 'a' }

  let { block, measure, beat } = sel
  const step = dir === 'right' ? 1 : -1
  beat += step
  if (beat >= num) {
    beat = 0; measure++
    if (measure >= (model.blocks[block]?.measures.length ?? 0)) {
      measure = 0; block++
      if (block >= model.blocks.length) return sel // clamp at end
    }
  } else if (beat < 0) {
    measure--
    if (measure < 0) {
      block--
      if (block < 0) return sel // clamp at start
      measure = model.blocks[block].measures.length - 1
    }
    beat = num - 1
  }
  const next: EditSelection = { block, voice: sel.voice, measure, beat, slot: null }
  const nextCell = cellAt(model, next)
  if (nextCell?.kind === 'pair') next.slot = step > 0 ? 'a' : 'b'
  return next
}

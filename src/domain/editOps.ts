import type { Voice, EditModel, EditCell, EditNote, EditSlot, EditSelection, EditBlock } from '../types'
import { parseBeatToken, splitSyllables } from './parser'
import { cellFromElements } from './editModel'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']

export type Rhythm = 'note' | 'pair' | 'triple' | 'quad' | 'tie' | 'rest'
const SLOTS: Partial<Record<Rhythm, number>> = { pair: 2, triple: 3, quad: 4 }

/** A toolbar/keyboard edit, applied to the currently selected cell. */
export type EditAction =
  | { type: 'rhythm'; value: Rhythm }
  /** chromatic: 1 sharp, -1 flat, 0 / absent natural (typing a note replaces its accidental). */
  | { type: 'degree'; value: string; chromatic?: number }
  | { type: 'accidental'; value: 'sharp' | 'flat' }
  | { type: 'octave'; value: 1 | -1 }
  /** Replace the whole cell with a typed beat token ("m.m.m"). Invalid token = no-op. */
  | { type: 'setToken'; value: string }

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

/** Number of slots a cell is split in (1 for a whole-beat cell). */
export function slotCount(cell: EditCell | undefined): number {
  return cell?.kind === 'tuple' ? cell.slots.length : 1
}

/** The note inside a cell that an action targets (respecting the active slot). */
function targetNote(cell: EditCell, slot: number | null): EditNote | null {
  if (cell.kind === 'note') return cell
  if (cell.kind === 'tuple') {
    const s = cell.slots[slot ?? 0]
    return s?.kind === 'note' ? s : null
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

function setSlot(cell: EditCell, slot: number | null, s: EditSlot): EditCell {
  if (cell.kind !== 'tuple') return s
  const i = slot ?? 0
  return { ...cell, slots: cell.slots.map((x, k) => k === i ? s : x) }
}

/** Pure: apply an edit action to a single cell, returning the new cell. */
export function applyToCell(cell: EditCell, slot: number | null, action: EditAction): EditCell {
  switch (action.type) {
    case 'rhythm': {
      const seed: EditNote = targetNote(cell, slot) ?? { kind: 'note', degree: 'd', chromatic: 0, octave: '' }
      if (action.value === 'note') return { ...seed }
      if (action.value === 'tie')  return { kind: 'tie' }
      if (action.value === 'rest') return { kind: 'rest' }
      return { kind: 'tuple', slots: Array.from({ length: SLOTS[action.value]! }, () => ({ ...seed })) }
    }
    case 'degree': {
      const cur = targetNote(cell, slot)
      return setSlot(cell, slot, { kind: 'note', degree: action.value, chromatic: action.chromatic ?? 0, octave: cur?.octave ?? '' })
    }
    case 'accidental': {
      const n = targetNote(cell, slot)
      if (!n) return cell
      const delta = action.value === 'sharp' ? 1 : -1
      return setSlot(cell, slot, { ...n, chromatic: n.chromatic === delta ? 0 : delta })
    }
    case 'octave': {
      const n = targetNote(cell, slot)
      if (!n) return cell
      return setSlot(cell, slot, { ...n, octave: levelToOctave(octaveToLevel(n.octave) + action.value) })
    }
    case 'setToken': {
      const els = parseBeatToken(action.value)
      return els ? cellFromElements(els) : cell
    }
  }
}

/** Pure: the selection reached by moving one step. Steps through a tuple's slots
 *  before crossing a beat, and wraps across measures/blocks. */
export function nextSelection(model: EditModel, sel: EditSelection, dir: 'left' | 'right' | 'up' | 'down'): EditSelection {
  const num = model.numerator

  if (dir === 'up' || dir === 'down') {
    const ni = Math.max(0, Math.min(3, VOICES.indexOf(sel.voice) + (dir === 'down' ? 1 : -1)))
    const voice = VOICES[ni]
    const cell = model.blocks[sel.block]?.measures[sel.measure]?.beats[voice]?.[sel.beat]
    return { ...sel, voice, slot: cell?.kind === 'tuple' ? 0 : null }
  }

  const cur = cellAt(model, sel)
  const n = slotCount(cur)
  if (dir === 'right' && n > 1 && (sel.slot ?? 0) < n - 1) return { ...sel, slot: (sel.slot ?? 0) + 1 }
  if (dir === 'left'  && n > 1 && (sel.slot ?? 0) > 0)     return { ...sel, slot: (sel.slot ?? 0) - 1 }

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
  if (nextCell?.kind === 'tuple') next.slot = step > 0 ? 0 : nextCell.slots.length - 1
  return next
}

// ── phrase structure ("à la ligne") ──────────────────────────

/** Sung notes (soprano onsets) in the first `count` measures of a block. */
function sopranoOnsets(block: EditBlock, count: number): number {
  return block.measures.slice(0, count).reduce((sum, m) =>
    sum + m.beats.S.reduce((s, c) =>
      s + (c.kind === 'note' ? 1 : c.kind === 'tuple' ? c.slots.filter(x => x.kind === 'note').length : 0), 0), 0)
}

/** Start a new phrase before measure `at` (1..n-1) of `block`. Lyrics are split by sung notes. */
export function splitBlock(model: EditModel, sel: EditSelection | null, block: number, at: number): { model: EditModel; sel: EditSelection | null } {
  const b = model.blocks[block]
  if (!b || at < 1 || at >= b.measures.length) return { model, sel }
  const syl = splitSyllables(b.lyrics)
  const k = sopranoOnsets(b, at)
  const first: EditBlock  = { ...b, lyrics: syl.slice(0, k).join(' '), measures: b.measures.slice(0, at) }
  const second: EditBlock = { comment: null, lyrics: syl.slice(k).join(' '), measures: b.measures.slice(at) }
  const blocks = [...model.blocks.slice(0, block), first, second, ...model.blocks.slice(block + 1)]
  const next = !sel ? sel
    : sel.block > block ? { ...sel, block: sel.block + 1 }
    : sel.block === block && sel.measure >= at ? { ...sel, block: block + 1, measure: sel.measure - at }
    : sel
  return { model: { ...model, blocks }, sel: next }
}

/** Join phrase `block` with the next one. */
export function mergeBlocks(model: EditModel, sel: EditSelection | null, block: number): { model: EditModel; sel: EditSelection | null } {
  const a = model.blocks[block], b = model.blocks[block + 1]
  if (!a || !b) return { model, sel }
  const merged: EditBlock = { ...a, lyrics: [a.lyrics, b.lyrics].filter(Boolean).join(' '), measures: [...a.measures, ...b.measures] }
  const blocks = [...model.blocks.slice(0, block), merged, ...model.blocks.slice(block + 2)]
  const next = !sel ? sel
    : sel.block === block + 1 ? { ...sel, block, measure: sel.measure + a.measures.length }
    : sel.block > block + 1 ? { ...sel, block: sel.block - 1 }
    : sel
  return { model: { ...model, blocks }, sel: next }
}

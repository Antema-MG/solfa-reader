import { useState, useCallback, useEffect, useRef } from 'react'
import type { EditModel, EditSelection } from '../types'
import { scoreToEditModel } from '../domain/editModel'
import { editModelToText } from '../domain/serialize'
import { applyToCell, withCell, cellAt, nextSelection, type EditAction } from '../domain/editOps'
import { usePlayer } from '../state/PlayerContext'

export type { EditAction }

export interface EditorState {
  isEditing: boolean
  model: EditModel | null
  selection: EditSelection | null
  enter: () => void
  exit: () => void
  select: (sel: EditSelection) => void
  move: (dir: 'left' | 'right' | 'up' | 'down') => void
  apply: (action: EditAction) => void
  save: () => void
  /** Library item being edited (autosaved by the shell), or null for a read-only source. */
  docId: string | null
  /** Enter edit mode on the score being opened now, autosaving into library item `id`. */
  editNew: (id: string) => void
}

/**
 * Stateful editor orchestration. Pure logic lives in `domain/editOps` +
 * `domain/{editModel,serialize}`; this hook only holds state and pipes edits back
 * to the player via `openFile` for live preview. Mirrors `useMsolfaPlayer`.
 */
export function useEditorState(): EditorState {
  const { score, openFile } = usePlayer()
  const [isEditing, setIsEditing] = useState(false)
  const [model, setModel]         = useState<EditModel | null>(null)
  const [selection, setSelection] = useState<EditSelection | null>(null)
  // Which library item the open score is, and its last saved text: entering edit on
  // any other score (different text) drops it, so edits never land in the wrong item.
  const [doc, setDoc] = useState<{ id: string; text: string | null } | null>(null)
  const [pending, setPending] = useState(false)
  // The note just typed: typing moves on to the next cell, so ♯ ♭ ' , typed right
  // after it must still change that note, not the empty cell now selected.
  const lastNote = useRef<{ typed: EditSelection; landed: EditSelection } | null>(null)

  const enter = useCallback(() => {
    if (!score) return
    const m = scoreToEditModel(score)
    setDoc(d => d && (d.text === null || d.text === editModelToText(m)) ? d : null)
    setModel(m)
    setSelection({ block: 0, voice: 'S', measure: 0, beat: 0, slot: null })
    setIsEditing(true)
  }, [score])

  const editNew = useCallback((id: string) => { setDoc({ id, text: null }); setPending(true) }, [])
  // The new score reaches `score` on the next render: enter edit mode then.
  useEffect(() => { if (pending && score) { setPending(false); enter() } }, [pending, score, enter])

  const exit   = useCallback(() => setIsEditing(false), [])
  const select = useCallback((sel: EditSelection) => { lastNote.current = null; setSelection(sel) }, [])

  const move = useCallback((dir: 'left' | 'right' | 'up' | 'down') => {
    lastNote.current = null
    setSelection(sel => (model && sel) ? nextSelection(model, sel, dir) : sel)
  }, [model])

  const apply = useCallback((action: EditAction) => {
    if (!model || !selection) return
    const ln = lastNote.current
    const modifier = action.type === 'accidental' || action.type === 'octave'
    const target = modifier && ln && JSON.stringify(ln.landed) === JSON.stringify(selection) ? ln.typed : selection
    if (!modifier) lastNote.current = null
    const cell = cellAt(model, target)
    if (!cell) return
    const next = withCell(model, target, applyToCell(cell, target.slot, action))
    if (action.type === 'rhythm' && action.value === 'pair' && selection.slot == null)
      setSelection({ ...selection, slot: 'a' })
    if (action.type === 'rhythm' && action.value !== 'pair' && selection.slot != null)
      setSelection({ ...selection, slot: null })
    // Typing a note moves on to the next cell, so a line is filled without aiming at each cell.
    if (action.type === 'degree') {
      const landed = nextSelection(next, selection, 'right')
      lastNote.current = { typed: selection, landed }
      setSelection(landed)
    }
    setModel(next)
    const text = editModelToText(next)
    setDoc(d => d && { ...d, text })
    openFile(text) // live preview: re-parse into the player
  }, [model, selection, openFile])

  const save = useCallback(() => {
    if (!model) return
    const blob = new Blob([editModelToText(model)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${model.meta.title || 'partition'}.msolfa`
    a.click()
    URL.revokeObjectURL(url)
  }, [model])

  return { isEditing, model, selection, enter, exit, select, move, apply, save, docId: doc?.id ?? null, editNew }
}

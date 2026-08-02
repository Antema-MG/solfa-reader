import { useState, useCallback } from 'react'
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

  const enter = useCallback(() => {
    if (!score) return
    setModel(scoreToEditModel(score))
    setSelection({ block: 0, voice: 'S', measure: 0, beat: 0, slot: null })
    setIsEditing(true)
  }, [score])

  const exit   = useCallback(() => setIsEditing(false), [])
  const select = useCallback((sel: EditSelection) => setSelection(sel), [])

  const move = useCallback((dir: 'left' | 'right' | 'up' | 'down') => {
    setSelection(sel => (model && sel) ? nextSelection(model, sel, dir) : sel)
  }, [model])

  const apply = useCallback((action: EditAction) => {
    if (!model || !selection) return
    const cell = cellAt(model, selection)
    if (!cell) return
    const next = withCell(model, selection, applyToCell(cell, selection.slot, action))
    if (action.type === 'rhythm' && action.value === 'pair' && selection.slot == null)
      setSelection({ ...selection, slot: 'a' })
    if (action.type === 'rhythm' && action.value !== 'pair' && selection.slot != null)
      setSelection({ ...selection, slot: null })
    setModel(next)
    openFile(editModelToText(next)) // live preview: re-parse into the player
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

  return { isEditing, model, selection, enter, exit, select, move, apply, save }
}

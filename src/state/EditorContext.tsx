import { createContext, useContext, type ReactNode } from 'react'
import { useEditorState, type EditorState } from '../hooks/useEditorState'

/**
 * Thin provider exposing the editor hook's value to the tree (mirrors
 * `PlayerContext` / `useMsolfaPlayer`). All logic lives in `useEditorState`
 * (hook) and `domain/editOps` (pure logic) — nothing here but plumbing.
 */
const EditorContext = createContext<EditorState | null>(null)

export function EditorProvider({ children }: { children: ReactNode }) {
  const editor = useEditorState()
  return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
}

export function useEditor(): EditorState {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used within <EditorProvider>')
  return ctx
}

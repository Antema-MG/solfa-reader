import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { syncToCatalog } from '../services/catalogSync'

/** A score the user added or fixed on this device (stored in the browser). */
export interface LibraryItem {
  id: string
  name: string          // file-ish name, for display when there is no Titre
  text: string
  origin?: string       // bundled catalog path this was fixed from (hides the original)
  updatedAt: number
}

interface Library {
  items: LibraryItem[]
  save: (item: Omit<LibraryItem, 'updatedAt'>) => void
  remove: (id: string) => void
}

const KEY = 'msolfa.library.v1'
const Ctx = createContext<Library | null>(null)

function load(): LibraryItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

export function newId(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'partition'}-${Date.now().toString(36)}`
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<LibraryItem[]>(load)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(items)) } catch { /* quota / private mode */ } }, [items])

  const save = useCallback((it: Omit<LibraryItem, 'updatedAt'>) => {
    setItems(xs => [{ ...it, updatedAt: Date.now() }, ...xs.filter(x => x.id !== it.id)])
    // Dev: also write catalog/<file>.msolfa; remember its path as `origin` (hides the bundled twin, keeps one entry).
    syncToCatalog(it, origin => setItems(xs => xs.map(x => x.id === it.id ? { ...x, origin } : x)))
  }, [])
  const remove = useCallback((id: string) => setItems(xs => xs.filter(x => x.id !== id)), [])

  const value = useMemo(() => ({ items, save, remove }), [items, save, remove])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLibrary(): Library {
  const c = useContext(Ctx)
  if (!c) throw new Error('useLibrary must be used within <LibraryProvider>')
  return c
}

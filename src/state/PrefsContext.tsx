import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Voice } from '../types'

export type FontSize = 0 | 1 | 2
export type ListenMode = 'solo' | 'front' | 'without' | 'tutti'
/** 'same' = like the other voices; else a General MIDI program name. */
export type MySound = 'same' | 'acoustic_grand_piano' | 'choir_aahs' | 'voice_oohs' | 'synth_choir'

/** Display + choir preferences shared by Écoute / Partition / Chorale. Persisted locally. */
export interface Prefs {
  myVoice: Voice                    // "je chante"
  zoom: number                      // 60..160 %
  fontSize: FontSize
  lyrics: boolean
  piano: boolean
  pianoL: boolean                   // piano in phone landscape (off by default: the score needs the room)
  mode: ListenMode
  mySound: MySound                  // instrument used for my voice only
}

const DEFAULTS: Prefs = {
  myVoice: 'A', zoom: 100, fontSize: 1, lyrics: true, piano: true, pianoL: false, mode: 'tutti', mySound: 'same',
}
const KEY = 'msolfa.prefs.v1'

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch { return DEFAULTS }
}

interface PrefsState extends Prefs {
  set: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void
}

const Ctx = createContext<PrefsState | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(load)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch { /* private mode */ } }, [prefs])

  const set = useCallback(<K extends keyof Prefs>(k: K, v: Prefs[K]) => setPrefs(p => ({ ...p, [k]: v })), [])
  const value = useMemo(() => ({ ...prefs, set }), [prefs, set])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePrefs(): PrefsState {
  const c = useContext(Ctx)
  if (!c) throw new Error('usePrefs must be used within <PrefsProvider>')
  return c
}

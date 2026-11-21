import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Voice } from '../types'
import type { SungStyle } from '../domain/choir'

export type FontSize = 0 | 1 | 2
export type ListenMode = 'solo' | 'front' | 'without' | 'tutti'
/** 'same' = like the other voices; else a General MIDI program name. */
export type MySound = 'same' | 'acoustic_grand_piano' | 'choir_aahs' | 'voice_oohs' | 'synth_choir' | SungStyle

/** Display + choir preferences shared by Écoute / Partition / Chorale. Persisted locally. */
export interface Prefs {
  myVoice: Voice                    // "je chante"
  noMine: boolean                   // Partition: no voice marked ("Aucune")
  shown: Record<Voice, boolean>     // voices drawn in the score (display only, not audio)
  zoom: number                      // 60..160 %
  fontSize: FontSize
  lyrics: boolean
  piano: boolean                    // piano on desktop web (shown by default)
  pianoM: boolean                   // piano on phone portrait (shown by default, like the design)
  pianoL: boolean                   // piano in phone landscape (off by default: the score needs the room)
  big: boolean                      // landscape: my voice drawn larger, the others smaller
  mode: ListenMode
  mySound: MySound                  // instrument used for my voice only
  singers: number                   // sung choir: singers per section (1..6)
  reverb: number                    // sung choir: church reverb 0..100
  panel: boolean                    // desktop: Chorale options column shown (Ctrl+B)
  library: boolean                  // desktop: library column shown (Ctrl+Alt+B)
}

const DEFAULTS: Prefs = {
  myVoice: 'A', noMine: false, shown: { S: true, A: true, T: true, B: true }, zoom: 100, fontSize: 1, lyrics: true, big: true, piano: true, pianoM: true, pianoL: false, mode: 'tutti', mySound: 'same', singers: 3, reverb: 45, panel: true, library: true,
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

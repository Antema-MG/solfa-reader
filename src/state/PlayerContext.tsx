import { createContext, useContext, type ReactNode } from 'react'
import { useMsolfaPlayer } from '../hooks/useMsolfaPlayer'
import type { MsolfaPlayerState } from '../types'

/**
 * Holds the single shared player instance. Previously this object was
 * prop-drilled as `player` into every component; it now lives in context so
 * new feature modules (mixer, editor, learning modes) can read it without
 * threading props through the tree.
 */
const PlayerContext = createContext<MsolfaPlayerState | null>(null)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = useMsolfaPlayer()
  return <PlayerContext.Provider value={player}>{children}</PlayerContext.Provider>
}

export function usePlayer(): MsolfaPlayerState {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within <PlayerProvider>')
  return ctx
}

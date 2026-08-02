import type { MsolfaPlayerState } from '../types'
import { usePlayerCore } from './usePlayerCore'
import { useScore } from './useScore'
import { useTransport } from './useTransport'
import { useMixer } from './useMixer'
import { useInstrument } from './useInstrument'

/**
 * Composes the player from a shared scheduling core plus concern-focused action
 * hooks (score / transport / mixer / instrument). Each piece is small and
 * testable; this hook only wires them into the public MsolfaPlayerState.
 */
export function useMsolfaPlayer(): MsolfaPlayerState {
  const core = usePlayerCore()
  const { openFile, setTempo, setTonic }           = useScore(core)
  const { play, pause, stop, seekTo }              = useTransport(core)
  const { toggleMute, toggleSolo, clearSelection } = useMixer(core)
  const { setTimbre, setInstrument }               = useInstrument(core)

  return {
    score: core.score, error: core.error, status: core.status,
    isPlaying: core.status === 'playing',
    tempo: core.tempo, tonic: core.tonic, timbre: core.timbre,
    instrumentId: core.instrumentId, instrumentLoading: core.instrumentLoading,
    muted: core.muted, solo: core.solo,
    currentBeat: core.currentBeat, litMidis: core.litMidis,
    openFile, play, pause, stop, seekTo,
    setTempo, setTonic, setTimbre, setInstrument,
    toggleMute, toggleSolo, clearSelection,
  }
}

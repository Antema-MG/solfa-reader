import { useCallback } from 'react'
import type { Voice } from '../types'
import type { PlayerCore } from './usePlayerCore'

/** Per-voice mute/solo and the A–B loop selection. */
export function useMixer(core: PlayerCore) {
  const {
    statusRef, mutedRef, soloRef, loopStartRef, loopEndRef,
    setMuted, setSolo, setLitMidis,
    scheduleFrom, getPosition, computeLitMidis,
  } = core

  const toggleMute = useCallback((v: Voice) => {
    const next = { ...mutedRef.current, [v]: !mutedRef.current[v] }
    mutedRef.current = next; setMuted({ ...next })
    if (statusRef.current === 'playing') scheduleFrom(getPosition())
    setLitMidis(computeLitMidis(Math.floor(getPosition())))
  }, [mutedRef, statusRef, setMuted, scheduleFrom, getPosition, computeLitMidis, setLitMidis])

  const toggleSolo = useCallback((v: Voice) => {
    const next = new Set(soloRef.current)
    next.has(v) ? next.delete(v) : next.add(v)
    soloRef.current = next; setSolo(new Set(next))
    if (statusRef.current === 'playing') scheduleFrom(getPosition())
    setLitMidis(computeLitMidis(Math.floor(getPosition())))
  }, [soloRef, statusRef, setSolo, scheduleFrom, getPosition, computeLitMidis, setLitMidis])

  const clearSelection = useCallback(() => {
    loopStartRef.current = null; loopEndRef.current = null
  }, [loopStartRef, loopEndRef])

  return { toggleMute, toggleSolo, clearSelection }
}

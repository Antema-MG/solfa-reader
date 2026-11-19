import { useCallback } from 'react'
import type { PlayerCore } from './usePlayerCore'

/** Transport controls: play / pause / stop / seek. */
export function useTransport(core: PlayerCore) {
  const {
    engineRef, scoreRef, statusRef, currentBeatRef, loopStartRef, loopEndRef,
    setStatus, setCurrentBeat, setLitMidis,
    isAudible, scheduleFrom, getPosition, computeLitMidis,
  } = core

  const play = useCallback(() => {
    const file = scoreRef.current
    if (!file) return
    const engine = engineRef.current
    engine.ensure()
    // Wait until the instrument has finished loading (the sung choir needs no samples).
    if (!engine.ready) return
    if (statusRef.current === 'paused') {
      engine.resume()
      statusRef.current = 'playing'; setStatus('playing')
      return
    }
    let pos = currentBeatRef.current
    if (pos >= file.totalBeats) pos = 0
    // A pickup is padded to a full measure (« || - : - : - : - : - : m | »): skip that
    // silent lead-in, or the first seconds sound like nothing is playing.
    const first = file.events.reduce((m, e) => Math.min(m, e.start), Infinity)
    if (pos < first && first < file.totalBeats) pos = first
    if (loopStartRef.current != null && (pos < loopStartRef.current || pos >= (loopEndRef.current ?? Infinity)))
      pos = loopStartRef.current
    engine.resume()
    engine.applyVoiceGains(isAudible)
    scheduleFrom(pos)
    statusRef.current = 'playing'; setStatus('playing')
  }, [engineRef, scoreRef, statusRef, currentBeatRef, loopStartRef, loopEndRef, setStatus, isAudible, scheduleFrom])

  const pause = useCallback(() => {
    if (statusRef.current !== 'playing') return
    currentBeatRef.current = getPosition()
    engineRef.current.suspend()
    statusRef.current = 'paused'; setStatus('paused')
  }, [statusRef, currentBeatRef, engineRef, setStatus, getPosition])

  const stop = useCallback(() => {
    engineRef.current.stopAll()
    statusRef.current = 'stopped'; setStatus('stopped')
    currentBeatRef.current = loopStartRef.current ?? 0
    setCurrentBeat(currentBeatRef.current)
    setLitMidis({})
  }, [engineRef, statusRef, currentBeatRef, loopStartRef, setStatus, setCurrentBeat, setLitMidis])

  const seekTo = useCallback((posBeats: number) => {
    const file = scoreRef.current
    if (!file) return
    posBeats = Math.max(0, Math.min(file.totalBeats, posBeats))
    currentBeatRef.current = posBeats
    if (statusRef.current === 'playing') {
      scheduleFrom(posBeats)
    } else {
      setCurrentBeat(posBeats)
      setLitMidis(computeLitMidis(Math.floor(posBeats)))
    }
  }, [scoreRef, statusRef, currentBeatRef, scheduleFrom, setCurrentBeat, setLitMidis, computeLitMidis])

  return { play, pause, stop, seekTo }
}

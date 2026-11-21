import { useCallback } from 'react'
import type { PlayerCore } from './usePlayerCore'
import { degreeToMidi, computePianoMidis, type NoteSpec } from '../domain/pitch'
import type { Voice } from '../types'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']

/** Transport controls: play / pause / stop / seek. */
export function useTransport(core: PlayerCore) {
  const {
    engineRef, scoreRef, statusRef, currentBeatRef, loopStartRef, loopEndRef, tonicRef,
    setStatus, setCurrentBeat, setLitMidis, setLoop,
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

  /** [start, end) of the phrase that contains `beat`. */
  const phraseRange = useCallback((beat: number): [number, number] | null => {
    const file = scoreRef.current
    if (!file || !file.renderBlocks.length) return null
    const starts = file.renderBlocks.map(b => b.measures[0].startBeat)
    let i = 0
    starts.forEach((s, k) => { if (s <= beat) i = k })
    return [starts[i], starts[i + 1] ?? file.totalBeats]
  }, [scoreRef])

  const seekTo = useCallback((posBeats: number) => {
    const file = scoreRef.current
    if (!file) return
    posBeats = Math.max(0, Math.min(file.totalBeats, posBeats))
    if (loopEndRef.current != null) {   // loop follows the phrase we jump to
      const r = phraseRange(posBeats)
      if (r) { loopStartRef.current = r[0]; loopEndRef.current = r[1] }
    }
    currentBeatRef.current = posBeats
    if (statusRef.current === 'playing') {
      scheduleFrom(posBeats)
    } else {
      setCurrentBeat(posBeats)
      setLitMidis(computeLitMidis(Math.floor(posBeats)))
    }
  }, [scoreRef, statusRef, currentBeatRef, loopStartRef, loopEndRef, phraseRange, scheduleFrom, setCurrentBeat, setLitMidis, computeLitMidis])

  const toggleLoop = useCallback(() => {
    if (loopEndRef.current != null) {
      loopStartRef.current = null; loopEndRef.current = null; setLoop(false)
    } else {
      const r = phraseRange(getPosition())
      if (!r) return
      loopStartRef.current = r[0]; loopEndRef.current = r[1]; setLoop(true)
    }
    if (statusRef.current === 'playing') scheduleFrom(getPosition())
  }, [loopStartRef, loopEndRef, setLoop, phraseRange, getPosition, statusRef, scheduleFrom])

  const playKey = useCallback(() => {
    engineRef.current.playPreview(degreeToMidi('d', '', 0, tonicRef.current, 4), 0.9)
  }, [engineRef, tonicRef])

  /** Starting notes: S, A, T, B one after the other (ex. mi · do · sol · do), then all together. */
  const playClefs = useCallback(() => {
    const file = scoreRef.current
    if (!file) return
    if (statusRef.current !== 'stopped') stop()
    const specs: Partial<Record<string, NoteSpec>> = {}
    VOICES.forEach(v => {
      if (!isAudible(v)) return
      const ev = file.events.filter(e => e.voice === v).reduce<typeof file.events[number] | null>((m, e) => (!m || e.start < m.start ? e : m), null)
      if (ev) specs[v] = { degree: ev.degree, chromatic: ev.chromatic, octave: ev.octave }
    })
    const midis = computePianoMidis(specs, tonicRef.current)
    engineRef.current.playClefs(VOICES.filter(v => specs[v] && midis[v] != null).map(v => ({ voice: v, midi: midis[v]!, degree: specs[v]!.degree })))
  }, [scoreRef, statusRef, tonicRef, engineRef, isAudible, stop])

  const playNote = useCallback((midi: number) => { engineRef.current.playPreview(midi, 0.5) }, [engineRef])

  return { play, pause, stop, seekTo, toggleLoop, playKey, playClefs, playNote }
}

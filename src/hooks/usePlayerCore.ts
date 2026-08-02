import { useState, useRef, useCallback, useEffect } from 'react'
import type { Voice, Timbre, Status, Score, NoteEvent } from '../types'
import type { InstrumentId } from '../types/music'
import { INSTRUMENT_BY_ID, DEFAULT_INSTRUMENT } from '../types/music'
import { AudioEngine } from '../services/audioEngine'
import { degreeToMidi, VOICE_BASE_OCTAVE, computePianoMidis, NoteSpec } from '../domain/pitch'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']
const LOOK = 0.06 // audio lookahead in seconds

function specsAtBeat(events: NoteEvent[], beat: number): Partial<Record<string, NoteSpec>> {
  const latest: Partial<Record<Voice, NoteEvent>> = {}
  for (const ev of events) {
    if (ev.start <= beat && beat < ev.start + ev.durBeats)
      if (!latest[ev.voice] || ev.start > latest[ev.voice]!.start) latest[ev.voice] = ev
  }
  const specs: Partial<Record<string, NoteSpec>> = {}
  for (const v of VOICES) {
    if (latest[v]) specs[v] = { degree: latest[v]!.degree, chromatic: latest[v]!.chromatic, octave: latest[v]!.octave }
  }
  return specs
}

/**
 * The shared player core: all mutable state (React state + scheduling refs) plus
 * the audio-scheduling primitives and the requestAnimationFrame transport loop.
 *
 * Audio scheduling is inherently cross-cutting (it reads score, tempo, tonic,
 * mute/solo together), so the shared state lives here in one cohesive place.
 * The user-facing actions are grouped by concern into thin hooks
 * (useScore / useTransport / useMixer / useInstrument) that operate on this core.
 */
export function usePlayerCore() {
  // ── React state (drives UI) ────────────────────────────────
  const [score,       setScore]      = useState<Score | null>(null)
  const [error,       setError]      = useState<string | null>(null)
  const [status,      setStatus]     = useState<Status>('stopped')
  const [tempo,       setTempoVal]   = useState(80)
  const [tonic,       setTonicVal]   = useState('G')
  const [timbre,      setTimbreVal]  = useState<Timbre>(INSTRUMENT_BY_ID[DEFAULT_INSTRUMENT].fallback)
  const [instrumentId,      setInstrumentIdVal] = useState<InstrumentId>(DEFAULT_INSTRUMENT)
  const [instrumentLoading, setInstrumentLoading] = useState(false)
  const [muted,       setMuted]      = useState<Record<Voice, boolean>>({ S:false, A:false, T:false, B:false })
  const [solo,        setSolo]       = useState<Set<Voice>>(new Set())
  const [currentBeat, setCurrentBeat] = useState(0)
  const [litMidis,    setLitMidis]   = useState<Partial<Record<Voice, number>>>({})

  // ── Refs (for scheduling — no re-render needed) ───────────
  // Lazy-init so the AudioEngine/Set aren't constructed and discarded each render.
  const engineRef        = useRef<AudioEngine>(null as unknown as AudioEngine)
  if (!engineRef.current) engineRef.current = new AudioEngine()
  const scoreRef         = useRef<Score | null>(null)
  const statusRef        = useRef<Status>('stopped')
  const tempoRef         = useRef(80)
  const tonicRef         = useRef('G')
  const mutedRef         = useRef<Record<Voice, boolean>>({ S:false, A:false, T:false, B:false })
  const soloRef          = useRef<Set<Voice>>(null as unknown as Set<Voice>)
  if (!soloRef.current) soloRef.current = new Set()
  const playStartBeatRef = useRef(0)
  const startCtxTimeRef  = useRef(0)
  const currentBeatRef   = useRef(0)
  const loopStartRef     = useRef<number | null>(null)
  const loopEndRef       = useRef<number | null>(null)
  const rafRef           = useRef(0)
  const instrumentIdRef  = useRef<InstrumentId>(DEFAULT_INSTRUMENT)
  const instrumentLoadingRef = useRef(false)

  // ── Scheduling primitives ─────────────────────────────────
  const isAudible = useCallback((v: string): boolean => {
    if (soloRef.current.size > 0) return soloRef.current.has(v as Voice)
    return !mutedRef.current[v as Voice]
  }, [])

  const secondsPerBeat = useCallback(() => 60 / tempoRef.current, [])

  const getPosition = useCallback((): number => {
    const file = scoreRef.current
    if (!file) return 0
    if (statusRef.current === 'stopped') return currentBeatRef.current
    const elapsed = engineRef.current.currentTime - startCtxTimeRef.current
    const pos = playStartBeatRef.current + elapsed / secondsPerBeat()
    return Math.max(0, Math.min(file.totalBeats, pos))
  }, [secondsPerBeat])

  const computeLitMidis = useCallback((beatIndex: number): Partial<Record<Voice, number>> => {
    const file = scoreRef.current
    if (!file) return {}
    const snd: Partial<Record<Voice, NoteEvent>> = {}
    file.events.forEach(ev => {
      if (ev.start <= beatIndex && beatIndex < ev.start + ev.durBeats)
        if (!snd[ev.voice] || ev.start > snd[ev.voice]!.start) snd[ev.voice] = ev
    })
    const specs: Partial<Record<string, NoteSpec>> = {}
    VOICES.forEach(v => {
      const ev = snd[v]
      if (ev) specs[v] = { degree: ev.degree, chromatic: ev.chromatic, octave: ev.octave }
    })
    const all = computePianoMidis(specs, tonicRef.current)
    const midis: Partial<Record<Voice, number>> = {}
    VOICES.forEach(v => { if (all[v] != null && isAudible(v)) midis[v] = all[v] })
    return midis
  }, [isAudible])

  const scheduleFrom = useCallback((posBeats: number) => {
    const engine = engineRef.current
    const file   = scoreRef.current
    if (!file) return
    engine.stopAll()
    const spb    = secondsPerBeat()
    const base   = engine.currentTime + LOOK
    startCtxTimeRef.current  = base
    playStartBeatRef.current = posBeats
    const upper = loopEndRef.current ?? file.totalBeats

    file.events.forEach(ev => {
      if (!isAudible(ev.voice)) return
      const evEnd = ev.start + ev.durBeats
      if (evEnd <= posBeats || ev.start >= upper) return
      const effStart = Math.max(ev.start, posBeats)
      const effEnd   = Math.min(evEnd, upper)
      const durSec   = (effEnd - effStart) * spb
      if (durSec <= 0) return
      const allMidis = computePianoMidis(specsAtBeat(file.events, ev.start), tonicRef.current)
      const midi = allMidis[ev.voice]
        ?? degreeToMidi(ev.degree, ev.octave, ev.chromatic, tonicRef.current, VOICE_BASE_OCTAVE[ev.voice])
      engine.scheduleNote(ev.voice, midi, base + (effStart - posBeats) * spb, durSec)
    })
  }, [secondsPerBeat, isAudible])

  // ── Animation loop ─────────────────────────────────────────
  useEffect(() => {
    let lastBi = -1
    const tick = () => {
      if (statusRef.current === 'playing') {
        const pos = getPosition()
        const bi  = Math.floor(pos)
        if (bi !== lastBi) {
          lastBi = bi
          setCurrentBeat(pos)
          setLitMidis(computeLitMidis(bi))
        }
        const file = scoreRef.current
        if (file) {
          if (loopEndRef.current != null && pos >= loopEndRef.current) {
            scheduleFrom(loopStartRef.current ?? 0)
          } else if (pos >= file.totalBeats) {
            engineRef.current.stopAll()
            statusRef.current = 'stopped'
            setStatus('stopped')
            currentBeatRef.current = 0
            setCurrentBeat(0)
            setLitMidis({})
            lastBi = -1
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [getPosition, computeLitMidis, scheduleFrom])

  return {
    // state
    score, setScore, error, setError, status, setStatus,
    tempo, setTempoVal, tonic, setTonicVal, timbre, setTimbreVal,
    instrumentId, setInstrumentIdVal, instrumentLoading, setInstrumentLoading,
    muted, setMuted, solo, setSolo, currentBeat, setCurrentBeat, litMidis, setLitMidis,
    // refs
    engineRef, scoreRef, statusRef, tempoRef, tonicRef, mutedRef, soloRef,
    playStartBeatRef, startCtxTimeRef, currentBeatRef, loopStartRef, loopEndRef,
    instrumentIdRef, instrumentLoadingRef,
    // primitives
    isAudible, secondsPerBeat, getPosition, computeLitMidis, scheduleFrom,
  }
}

export type PlayerCore = ReturnType<typeof usePlayerCore>

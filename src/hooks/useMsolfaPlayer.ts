import { useState, useRef, useCallback, useEffect } from 'react'
import type { MsolfaPlayerState, Voice, Timbre, Status, Score, NoteEvent } from '../types'
import type { InstrumentId } from '../types/music'
import { INSTRUMENT_BY_ID, DEFAULT_INSTRUMENT } from '../types/music'
import { parseMsolfa }  from '../lib/parser'
import { AudioEngine }  from '../lib/audioEngine'
import { loadInstrument } from '../lib/soundfont'
import { degreeToMidi, VOICE_BASE_OCTAVE, computePianoMidis, NoteSpec } from '../lib/pitch'
import { DEFAULT_PIECE } from '../lib/defaults'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']
const LOOK = 0.06   // audio lookahead in seconds

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

export function useMsolfaPlayer(): MsolfaPlayerState {
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
  const engineRef        = useRef(new AudioEngine())
  const scoreRef         = useRef<Score | null>(null)
  const statusRef        = useRef<Status>('stopped')
  const tempoRef         = useRef(80)
  const tonicRef         = useRef('G')
  const mutedRef         = useRef<Record<Voice, boolean>>({ S:false, A:false, T:false, B:false })
  const soloRef          = useRef<Set<Voice>>(new Set())
  const playStartBeatRef = useRef(0)
  const startCtxTimeRef  = useRef(0)
  const currentBeatRef   = useRef(0)
  const loopStartRef     = useRef<number | null>(null)
  const loopEndRef       = useRef<number | null>(null)
  const rafRef           = useRef(0)
  const instrumentIdRef  = useRef<InstrumentId>(DEFAULT_INSTRUMENT)
  const instrumentLoadingRef = useRef(false)

  // ── Helpers ───────────────────────────────────────────────
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
    // Collect active event per voice at this beat (all voices, for placement context)
    const snd: Partial<Record<Voice, NoteEvent>> = {}
    file.events.forEach(ev => {
      if (ev.start <= beatIndex && beatIndex < ev.start + ev.durBeats)
        if (!snd[ev.voice] || ev.start > snd[ev.voice]!.start) snd[ev.voice] = ev
    })
    // Build specs for all active voices (dynamic placement uses all, even muted)
    const specs: Partial<Record<string, NoteSpec>> = {}
    VOICES.forEach(v => {
      const ev = snd[v]
      if (ev) specs[v] = { degree: ev.degree, chromatic: ev.chromatic, octave: ev.octave }
    })
    const all = computePianoMidis(specs, tonicRef.current)
    // Only expose audible voices in output
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

  // ── Load DEFAULT_PIECE on mount ────────────────────────────
  useEffect(() => {
    const result = parseMsolfa(DEFAULT_PIECE)
    if (result.success) {
      scoreRef.current = result.file
      setScore(result.file)
      tempoRef.current = result.file.metadata.tempo
      setTempoVal(result.file.metadata.tempo)
      tonicRef.current = result.file.metadata.key
      setTonicVal(result.file.metadata.key)
    }
  }, [])

  // ── Actions ───────────────────────────────────────────────
  const openFile = useCallback((text: string) => {
    engineRef.current.stopAll()
    statusRef.current = 'stopped'; setStatus('stopped')
    currentBeatRef.current = 0;    setCurrentBeat(0)
    loopStartRef.current = null;   loopEndRef.current = null
    const result = parseMsolfa(text)
    if (!result.success) {
      scoreRef.current = null; setScore(null)
      setError(result.errors.map(e => `${e.line ? 'L' + e.line + ' : ' : ''}${e.message}`).join('\n'))
      return
    }
    setError(null)
    scoreRef.current = result.file; setScore(result.file)
    tempoRef.current = result.file.metadata.tempo; setTempoVal(result.file.metadata.tempo)
    tonicRef.current = result.file.metadata.key;   setTonicVal(result.file.metadata.key)
    mutedRef.current = { S:false, A:false, T:false, B:false }; setMuted({ S:false, A:false, T:false, B:false })
    soloRef.current  = new Set(); setSolo(new Set())
    setLitMidis({})
  }, [])

  const play = useCallback(() => {
    const file = scoreRef.current
    if (!file) return
    const engine = engineRef.current
    engine.ensure()
    // Sampler-only playback: wait until the instrument has finished loading.
    if (!engine.hasSampler) return
    if (statusRef.current === 'paused') {
      engine.resume()
      statusRef.current = 'playing'; setStatus('playing')
      return
    }
    let pos = currentBeatRef.current
    if (pos >= file.totalBeats) pos = 0
    if (loopStartRef.current != null && (pos < loopStartRef.current || pos >= (loopEndRef.current ?? Infinity)))
      pos = loopStartRef.current
    engine.resume()
    engine.applyVoiceGains(isAudible)
    scheduleFrom(pos)
    statusRef.current = 'playing'; setStatus('playing')
  }, [isAudible, scheduleFrom])

  const pause = useCallback(() => {
    if (statusRef.current !== 'playing') return
    currentBeatRef.current = getPosition()
    engineRef.current.suspend()
    statusRef.current = 'paused'; setStatus('paused')
  }, [getPosition])

  const stop = useCallback(() => {
    engineRef.current.stopAll()
    statusRef.current = 'stopped'; setStatus('stopped')
    currentBeatRef.current = loopStartRef.current ?? 0
    setCurrentBeat(currentBeatRef.current)
    setLitMidis({})
  }, [])

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
  }, [scheduleFrom, computeLitMidis])

  const setTempo = useCallback((bpm: number) => {
    tempoRef.current = bpm; setTempoVal(bpm)
    if (statusRef.current === 'playing') scheduleFrom(getPosition())
  }, [scheduleFrom, getPosition])

  const setTonic = useCallback((key: string) => {
    tonicRef.current = key; setTonicVal(key)
    if (statusRef.current === 'playing') scheduleFrom(getPosition())
    setLitMidis(computeLitMidis(Math.floor(getPosition())))
  }, [scheduleFrom, getPosition, computeLitMidis])

  const setTimbre = useCallback((t: Timbre) => {
    engineRef.current.timbre = t; setTimbreVal(t)
    if (statusRef.current === 'playing') scheduleFrom(getPosition())
  }, [scheduleFrom, getPosition])

  // Load (or swap) the sampled instrument the react-piano way: stop sound, show
  // a loading state, and only expose the new samples once fully decoded — no
  // synth fallback, so nothing ever doubles or plays the wrong timbre.
  const setInstrument = useCallback((id: InstrumentId) => {
    const engine = engineRef.current
    const meta   = INSTRUMENT_BY_ID[id]
    instrumentIdRef.current = id; setInstrumentIdVal(id)
    // Drives the keyboard chrome skin (organ/piano/melodic) only.
    engine.timbre = meta.fallback; setTimbreVal(meta.fallback)
    // Stop anything currently sounding and detach the old sampler for a clean swap.
    engine.stopAll()
    engine.setSampler(null)
    statusRef.current = 'stopped'; setStatus('stopped')
    setLitMidis({})
    engine.ensure()
    const ctx = engine.audioContext
    if (!ctx) return
    instrumentLoadingRef.current = true; setInstrumentLoading(true)
    loadInstrument(ctx, id, engine.samplerDestination ?? undefined)
      .then(player => {
        // Ignore stale loads if the user switched again while fetching.
        if (instrumentIdRef.current !== id) return
        engine.setSampler(player)
      })
      .catch(() => { /* offline / fetch failed — stays silent until retried */ })
      .finally(() => {
        if (instrumentIdRef.current === id) {
          instrumentLoadingRef.current = false; setInstrumentLoading(false)
        }
      })
  }, [])

  const toggleMute = useCallback((v: Voice) => {
    const next = { ...mutedRef.current, [v]: !mutedRef.current[v] }
    mutedRef.current = next; setMuted({ ...next })
    if (statusRef.current === 'playing') scheduleFrom(getPosition())
    setLitMidis(computeLitMidis(Math.floor(getPosition())))
  }, [scheduleFrom, getPosition, computeLitMidis])

  const toggleSolo = useCallback((v: Voice) => {
    const next = new Set(soloRef.current)
    next.has(v) ? next.delete(v) : next.add(v)
    soloRef.current = next; setSolo(new Set(next))
    if (statusRef.current === 'playing') scheduleFrom(getPosition())
    setLitMidis(computeLitMidis(Math.floor(getPosition())))
  }, [scheduleFrom, getPosition, computeLitMidis])

  const clearSelection = useCallback(() => {
    loopStartRef.current = null; loopEndRef.current = null
  }, [])

  // Preload the default instrument on mount so the first Play is ready to sound.
  useEffect(() => { setInstrument(DEFAULT_INSTRUMENT) }, [setInstrument])

  return {
    score, error, status,
    isPlaying: status === 'playing',
    tempo, tonic, timbre, instrumentId, instrumentLoading, muted, solo,
    currentBeat, litMidis,
    openFile, play, pause, stop, seekTo,
    setTempo, setTonic, setTimbre, setInstrument,
    toggleMute, toggleSolo, clearSelection,
  }
}

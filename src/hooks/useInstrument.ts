import { useCallback, useEffect } from 'react'
import type { Timbre, Voice } from '../types'
import type { InstrumentId } from '../types/music'
import { INSTRUMENT_BY_ID, DEFAULT_INSTRUMENT } from '../types/music'
import { loadInstrument } from '../services/soundfont'
import type { PlayerCore } from './usePlayerCore'
import { isSung, type SungStyle } from '../domain/choir'
import type { ChoirFx } from '../services/choirSynth'
import type { Takes } from '../services/recordedChoir'

/** Sampled-instrument loading + the synth-fallback timbre. */
export function useInstrument(core: PlayerCore) {
  const {
    engineRef, statusRef, instrumentIdRef, instrumentLoadingRef,
    setInstrumentIdVal, setInstrumentLoading, setTimbreVal, setStatus, setLitMidis, setSungVal,
    scheduleFrom, getPosition,
  } = core

  const setTimbre = useCallback((t: Timbre) => {
    engineRef.current.timbre = t; setTimbreVal(t)
    if (statusRef.current === 'playing') scheduleFrom(getPosition())
  }, [engineRef, statusRef, setTimbreVal, scheduleFrom, getPosition])

  // Load (or swap) the sampled instrument the react-piano way: stop sound, show
  // a loading state, and only expose the new samples once fully decoded — no
  // synth fallback, so nothing ever doubles or plays the wrong timbre.
  const setInstrument = useCallback((id: InstrumentId) => {
    const engine = engineRef.current
    const meta   = INSTRUMENT_BY_ID[id]
    instrumentIdRef.current = id; setInstrumentIdVal(id)
    engine.setSung(null); setSungVal(null)
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
  }, [engineRef, instrumentIdRef, instrumentLoadingRef, setInstrumentIdVal, setTimbreVal, setStatus, setLitMidis, setInstrumentLoading, setSungVal])

  /** Switch the whole choir to realistic sung voices (solfège syllables or one vowel). */
  const setSung = useCallback((style: SungStyle) => {
    const engine = engineRef.current
    engine.stopAll()
    engine.ensure()
    engine.setSung(style); setSungVal(style)
    statusRef.current = 'stopped'; setStatus('stopped')
    setLitMidis({})
    setInstrumentLoading(false) // the choir needs no samples
  }, [engineRef, statusRef, setSungVal, setStatus, setLitMidis, setInstrumentLoading])

  const setChoirFx = useCallback((fx: ChoirFx) => engineRef.current.setChoirFx(fx), [engineRef])
  const setTakes = useCallback((t: Takes) => engineRef.current.setTakes(t), [engineRef])

  /** Give one voice its own sampled instrument (null = same as everyone). */
  const setVoiceInstrument = useCallback((v: Voice, id: InstrumentId | SungStyle | null) => {
    const engine = engineRef.current
    engine.setVoiceSung(v, id && isSung(id) ? id : null)
    if (!id || isSung(id)) { engine.setVoiceSampler(v, null); return }
    engine.ensure()
    const ctx = engine.audioContext
    if (!ctx) return
    loadInstrument(ctx, id, engine.samplerDestination ?? undefined)
      .then(player => engine.setVoiceSampler(v, player))
      .catch(() => engine.setVoiceSampler(v, null))
  }, [engineRef])

  // Preload the default instrument on mount so the first Play is ready to sound.
  useEffect(() => { setInstrument(DEFAULT_INSTRUMENT) }, [setInstrument])

  return { setTimbre, setInstrument, setVoiceInstrument, setSung, setChoirFx, setTakes }
}

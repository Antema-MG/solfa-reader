import { useCallback, useEffect } from 'react'
import type { Timbre } from '../types'
import type { InstrumentId } from '../types/music'
import { INSTRUMENT_BY_ID, DEFAULT_INSTRUMENT } from '../types/music'
import { loadInstrument } from '../services/soundfont'
import type { PlayerCore } from './usePlayerCore'

/** Sampled-instrument loading + the synth-fallback timbre. */
export function useInstrument(core: PlayerCore) {
  const {
    engineRef, statusRef, instrumentIdRef, instrumentLoadingRef,
    setInstrumentIdVal, setInstrumentLoading, setTimbreVal, setStatus, setLitMidis,
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
  }, [engineRef, instrumentIdRef, instrumentLoadingRef, setInstrumentIdVal, setTimbreVal, setStatus, setLitMidis, setInstrumentLoading])

  // Preload the default instrument on mount so the first Play is ready to sound.
  useEffect(() => { setInstrument(DEFAULT_INSTRUMENT) }, [setInstrument])

  return { setTimbre, setInstrument }
}

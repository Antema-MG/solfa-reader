import { useCallback, useEffect } from 'react'
import type { PlayerCore } from './usePlayerCore'
import { parseMsolfa } from '../domain/parser'
import { DEFAULT_PIECE } from '../domain/defaults'

const LAST = 'msolfa.lastScore.v1'   // the score open when the app was last used (edits included)
const remember = (text: string) => { try { localStorage.setItem(LAST, text) } catch { /* quota / private mode */ } }
const recall = () => { try { return localStorage.getItem(LAST) } catch { return null } }

/** Score loading/parsing and the derived tempo/tonic controls. */
export function useScore(core: PlayerCore) {
  const {
    engineRef, scoreRef, statusRef, currentBeatRef, loopStartRef, loopEndRef,
    tempoRef, tonicRef, mutedRef, soloRef,
    setScore, setError, setStatus, setCurrentBeat, setTempoVal, setTonicVal, setMuted, setSolo, setLitMidis, setLoop,
    scheduleFrom, getPosition, computeLitMidis,
  } = core

  const openFile = useCallback((text: string, keepMix = false) => {
    engineRef.current.stopAll()
    statusRef.current = 'stopped'; setStatus('stopped')
    currentBeatRef.current = 0;    setCurrentBeat(0)
    loopStartRef.current = null;   loopEndRef.current = null; setLoop(false)
    const result = parseMsolfa(text)
    if (!result.success) {
      scoreRef.current = null; setScore(null)
      setError(result.errors.map(e => `${e.line ? 'L' + e.line + ' : ' : ''}${e.message}`).join('\n'))
      return
    }
    setError(null)
    remember(text)
    scoreRef.current = result.file; setScore(result.file)
    if (!keepMix) {
      tempoRef.current = result.file.metadata.tempo; setTempoVal(result.file.metadata.tempo)
      tonicRef.current = result.file.metadata.key;   setTonicVal(result.file.metadata.key)
      mutedRef.current = { S:false, A:false, T:false, B:false }; setMuted({ S:false, A:false, T:false, B:false })
      soloRef.current  = new Set(); setSolo(new Set())
    }
    setLitMidis({})
  }, [engineRef, scoreRef, statusRef, currentBeatRef, loopStartRef, loopEndRef, tempoRef, tonicRef, mutedRef, soloRef, setScore, setError, setStatus, setCurrentBeat, setTempoVal, setTonicVal, setMuted, setSolo, setLitMidis])

  const setTempo = useCallback((bpm: number) => {
    tempoRef.current = bpm; setTempoVal(bpm)
    if (statusRef.current === 'playing') scheduleFrom(getPosition())
  }, [tempoRef, statusRef, setTempoVal, scheduleFrom, getPosition])

  const setTonic = useCallback((key: string) => {
    tonicRef.current = key; setTonicVal(key)
    if (statusRef.current === 'playing') scheduleFrom(getPosition())
    setLitMidis(computeLitMidis(Math.floor(getPosition())))
  }, [tonicRef, statusRef, setTonicVal, scheduleFrom, getPosition, computeLitMidis, setLitMidis])

  // Load DEFAULT_PIECE on mount.
  useEffect(() => {
    const saved = recall()
    const last = saved ? parseMsolfa(saved) : null
    const result = last?.success ? last : parseMsolfa(DEFAULT_PIECE)
    if (result.success) {
      scoreRef.current = result.file
      setScore(result.file)
      tempoRef.current = result.file.metadata.tempo
      setTempoVal(result.file.metadata.tempo)
      tonicRef.current = result.file.metadata.key
      setTonicVal(result.file.metadata.key)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { openFile, setTempo, setTonic }
}

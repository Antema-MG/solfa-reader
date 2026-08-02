import { useState, useRef, useCallback, useEffect } from 'react'
import { AudioEngine } from '../services/audioEngine'
import { PitchDetector } from '../services/pitchDetector'
import { METHOD } from '../domain/method'

/**
 * Méthode practice state machine. Owns its own AudioEngine (model + echo) and a
 * PitchDetector (mic). Validation is shared by the on-screen keyboard and the
 * mic, matched on PITCH CLASS (octave-tolerant) for robustness. All lessons are
 * freely accessible (no locks). Decoupled from the player.
 */
export function useMethod() {
  const engineRef   = useRef<AudioEngine>(null as unknown as AudioEngine)
  if (!engineRef.current) { engineRef.current = new AudioEngine(); engineRef.current.timbre = 'piano' }
  const detectorRef = useRef<PitchDetector>(null as unknown as PitchDetector)
  if (!detectorRef.current) detectorRef.current = new PitchDetector()

  const [lessonIdx, setLessonIdx] = useState(0)
  const [noteIdx, setNoteIdx]     = useState(0)
  const [micOn, setMicOn]         = useState(false)
  const [micError, setMicError]   = useState<string | null>(null)
  const [detected, setDetected]   = useState<{ midi: number; cents: number } | null>(null)
  const [wrong, setWrong]         = useState(false)

  const lesson    = METHOD[lessonIdx]
  const completed = noteIdx >= lesson.exercise.length
  const expected  = completed ? null : lesson.exercise[noteIdx].midi

  // Refs mirror state for the mic callback closure.
  const lessonIdxRef = useRef(lessonIdx); lessonIdxRef.current = lessonIdx
  const expectedRef  = useRef<number | null>(expected); expectedRef.current = expected
  const armedRef     = useRef(true) // mic: accept one note per attack (re-armed on silence)

  const validate = useCallback((midi: number) => {
    const exp = expectedRef.current
    if (exp == null) return
    if (midi % 12 === exp % 12) {
      engineRef.current.playPreview(exp, 0.6)
      setWrong(false)
      setNoteIdx(i => i + 1)
    } else {
      setWrong(true)
    }
  }, [])

  const pressKey = useCallback((midi: number) => validate(midi), [validate])

  const playModel = useCallback(() => {
    lesson.exercise.forEach((n, i) => setTimeout(() => engineRef.current.playPreview(n.midi, 0.45), i * 520))
  }, [lesson])

  const selectLesson = useCallback((i: number) => {
    if (i < 0 || i >= METHOD.length) return
    setLessonIdx(i); setNoteIdx(0); setWrong(false)
  }, [])

  const nextLesson = useCallback(() => selectLesson(lessonIdx + 1), [selectLesson, lessonIdx])
  const prevLesson = useCallback(() => selectLesson(lessonIdx - 1), [selectLesson, lessonIdx])

  const toggleMic = useCallback(async () => {
    const det = detectorRef.current
    if (det.running) { det.stop(); setMicOn(false); setDetected(null); return }
    try {
      await det.start((midi, cents) => {
        if (midi == null) { setDetected(null); armedRef.current = true; return }
        setDetected({ midi, cents })
        if (armedRef.current) { armedRef.current = false; validate(midi) }
      })
      setMicOn(true); setMicError(null)
    } catch {
      setMicError('Micro indisponible ou refusé — utilise le clavier à l’écran.')
      setMicOn(false)
    }
  }, [validate])

  // Stop the mic on unmount.
  useEffect(() => () => detectorRef.current.stop(), [])

  return {
    lessons: METHOD, lessonIdx, lesson, noteIdx, completed, expected,
    micOn, micError, detected, wrong,
    selectLesson, nextLesson, prevLesson, playModel, pressKey, toggleMic,
  }
}

export type MethodHook = ReturnType<typeof useMethod>

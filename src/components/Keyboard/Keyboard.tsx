import { useCallback, useState } from 'react'
import type { Voice } from '../../types'
import type { KeyboardVariant } from '../../types/music'
import { midiToFrenchName } from '../../lib/pitch'

// Range C1–C6 (same as the previous keybed; superset of the C2–C6 minimum).
const PIANO_LOW   = 24  // C1
const PIANO_HIGH  = 84  // C6
const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const WHITE_SEMIS = [0, 2, 4, 5, 7, 9, 11]
const HAS_BLACK   = new Set(['C', 'D', 'F', 'G', 'A'])
const WHITE_W = 24
const BLACK_W = 15

interface WKey { midi: number; wIdx: number; note: string; oct: number }
interface BKey { midi: number; leftPx: number; oct: number }

function buildKeys() {
  const whites: WKey[] = []
  const blacks: BKey[] = []
  let wIdx = 0
  for (let oct = 1; oct <= 6; oct++) {
    WHITE_NOTES.forEach((note, ni) => {
      const midi = (oct + 1) * 12 + WHITE_SEMIS[ni]
      if (midi < PIANO_LOW || midi > PIANO_HIGH) return
      whites.push({ midi, wIdx, note, oct })
      if (HAS_BLACK.has(note)) {
        const bm = midi + 1
        if (bm <= PIANO_HIGH) blacks.push({ midi: bm, leftPx: wIdx * WHITE_W + WHITE_W - BLACK_W / 2, oct })
      }
      wIdx++
    })
  }
  return { whites, blacks, wCount: wIdx }
}

const { whites, blacks, wCount } = buildKeys()
const ALL_VOICES: Voice[] = ['S', 'A', 'T', 'B']

const VOICE_COLOR: Record<Voice, string> = {
  S: 'var(--s)', A: 'var(--a)', T: 'var(--t)', B: 'var(--b)',
}
const VOICE_GLOW: Record<Voice, string> = {
  S: 'rgba(226,75,74,0.65)', A: 'rgba(55,138,221,0.65)',
  T: 'rgba(99,153,34,0.65)', B: 'rgba(186,117,23,0.65)',
}

export interface KeyboardProps {
  variant: KeyboardVariant
  /** voice → midi currently sounding (drives coloured highlight). */
  litMidis: Partial<Record<Voice, number>>
  tonic: string
  showNames?: boolean
  disabled?: boolean
  onPress?: (midi: number) => void
  onRelease?: (midi: number) => void
}

export default function Keyboard({
  variant, litMidis, tonic, showNames = false, disabled = false, onPress, onRelease,
}: KeyboardProps) {
  const [pressed, setPressed] = useState<Set<number>>(new Set())

  // midi → voice for fast colour lookup
  const midiVoice: Record<number, Voice> = {}
  ALL_VOICES.forEach(v => { const m = litMidis[v]; if (m != null) midiVoice[m] = v })

  // Organ presets: low octave (C2–B2 = oct 2) shows inverted colours
  const isInverted = (oct: number) => variant === 'organ' && oct === 2

  const press = useCallback((midi: number) => {
    if (disabled) return
    setPressed(p => { const n = new Set(p); n.add(midi); return n })
    onPress?.(midi)
  }, [disabled, onPress])

  const release = useCallback((midi: number) => {
    setPressed(p => { if (!p.has(midi)) return p; const n = new Set(p); n.delete(midi); return n })
    onRelease?.(midi)
  }, [onRelease])

  function whiteBg(inverted: boolean, voice: Voice | undefined): string {
    if (voice) return `linear-gradient(180deg, ${VOICE_COLOR[voice]}, color-mix(in srgb, ${VOICE_COLOR[voice]} 70%, #000))`
    if (inverted) return 'linear-gradient(180deg, #2f2b24 0%, #201d18 100%)'
    return 'linear-gradient(180deg, #fbf7ec 0%, #efe7d4 55%, #d9cdb2 100%)'
  }
  function blackBg(inverted: boolean, voice: Voice | undefined): string {
    if (voice) return `linear-gradient(180deg, color-mix(in srgb, ${VOICE_COLOR[voice]} 85%, #fff) 0%, ${VOICE_COLOR[voice]} 100%)`
    if (inverted) return 'linear-gradient(180deg, #fbf7ec 0%, #d9cdb2 100%)'
    return 'linear-gradient(180deg, #3c3c44 0%, #161619 45%, #050506 100%)'
  }

  return (
    <div
      className="kb-keybed"
      role="application"
      aria-label="Clavier virtuel"
      aria-disabled={disabled}
      style={{
        width: wCount * WHITE_W + 16,
        margin: '0 auto',
        height: 132,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div style={{ position: 'relative', width: wCount * WHITE_W, height: 116 }}>
        {/* White keys */}
        {whites.map(k => {
          const voice = midiVoice[k.midi]
          const inv = isInverted(k.oct)
          const isDown = pressed.has(k.midi)
          return (
            <div
              key={k.midi}
              className={`kb-key kb-white${isDown ? ' pressed' : ''}`}
              role="button"
              tabIndex={-1}
              aria-label={`${midiToFrenchName(k.midi, tonic)}${voice ? `, voix ${voice}` : ''}`}
              onPointerDown={e => { e.preventDefault(); press(k.midi) }}
              onPointerUp={() => release(k.midi)}
              onPointerLeave={() => release(k.midi)}
              style={{
                position: 'absolute', left: k.wIdx * WHITE_W, top: 0,
                width: WHITE_W - 1, height: 116,
                background: whiteBg(inv, voice),
                border: '1px solid #4a4640',
                borderRadius: '2px 2px 6px 6px',
                boxShadow: voice
                  ? `0 0 12px 2px ${VOICE_GLOW[voice]}, inset 0 -6px 8px rgba(0,0,0,0.12)`
                  : 'inset 0 -6px 8px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.5)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                paddingBottom: 5, cursor: disabled ? 'default' : 'pointer',
                zIndex: 1,
              }}
            >
              {(showNames || k.note === 'C') && (
                <span style={{
                  fontSize: 8, fontFamily: 'var(--mono)',
                  color: inv ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
                  pointerEvents: 'none', whiteSpace: 'nowrap',
                }}>
                  {showNames ? midiToFrenchName(k.midi, tonic) : `C${k.oct}`}
                </span>
              )}
            </div>
          )
        })}
        {/* Black keys */}
        {blacks.map(k => {
          const voice = midiVoice[k.midi]
          const inv = isInverted(k.oct)
          const isDown = pressed.has(k.midi)
          return (
            <div
              key={k.midi}
              className={`kb-key kb-black${isDown ? ' pressed' : ''}`}
              role="button"
              tabIndex={-1}
              aria-label={`${midiToFrenchName(k.midi, tonic)}${voice ? `, voix ${voice}` : ''}`}
              onPointerDown={e => { e.preventDefault(); press(k.midi) }}
              onPointerUp={() => release(k.midi)}
              onPointerLeave={() => release(k.midi)}
              style={{
                position: 'absolute', left: k.leftPx, top: 0,
                width: BLACK_W, height: 72,
                background: blackBg(inv, voice),
                border: '1px solid #000',
                borderRadius: '0 0 4px 4px',
                boxShadow: voice
                  ? `0 0 12px 2px ${VOICE_GLOW[voice]}, 0 3px 5px rgba(0,0,0,0.6)`
                  : 'inset 0 2px 1px rgba(255,255,255,0.25), 0 4px 6px rgba(0,0,0,0.7)',
                cursor: disabled ? 'default' : 'pointer',
                zIndex: 2,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

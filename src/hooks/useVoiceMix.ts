import { usePlayer } from '../state/PlayerContext'
import { usePrefs } from '../state/PrefsContext'
import { ALL_VOICES, MIX_PRESETS, mixLabel, presetFor } from '../domain/mix'
import type { Voice } from '../types'

/** Who sings, as one list: tap a voice to add/remove it, or pick a preset (Tous, S · A, Sans ma voix…). */
export function useVoiceMix() {
  const { muted, solo, setAudible } = usePlayer()
  const { myVoice } = usePrefs()
  const on = ALL_VOICES.filter(v => (solo.size ? solo.has(v) : !muted[v]))
  const toggle = (v: Voice) => {
    const next = on.includes(v) ? on.filter(x => x !== v) : [...on, v]
    if (next.length) setAudible(next)            // never silence everyone by accident
  }
  return {
    on, toggle, myVoice,
    presets: MIX_PRESETS.map(p => ({ id: p.id, label: p.label(myVoice), active: presetFor(on, myVoice)?.id === p.id, apply: () => setAudible(p.voices(myVoice)) })),
    label: mixLabel(on, myVoice),
  }
}

import type { Voice } from '../types'

export const ALL_VOICES: Voice[] = ['S', 'A', 'T', 'B']

/** One-tap "who sings" choices. `mine` = the voice the user marked as theirs. */
export const MIX_PRESETS: { id: string; label: (mine: Voice) => string; voices: (mine: Voice) => Voice[] }[] = [
  { id: 'all',     label: () => 'Tous',              voices: () => ALL_VOICES },
  { id: 'sa',      label: () => 'S · A',             voices: () => ['S', 'A'] },
  { id: 'tb',      label: () => 'T · B',             voices: () => ['T', 'B'] },
  { id: 'mine',    label: m => `${m} seule`,         voices: m => [m] },
  { id: 'without', label: m => `Sans ${m}`,          voices: m => ALL_VOICES.filter(v => v !== m) },
]

const same = (a: Voice[], b: Voice[]) => a.length === b.length && a.every(v => b.includes(v))

/** The preset matching exactly these voices (first match wins), or null for a custom mix. */
export const presetFor = (on: Voice[], mine: Voice) => MIX_PRESETS.find(p => same(p.voices(mine), on)) ?? null

/** Short label of a mix: preset name, else the voices joined ("S · T"). */
export const mixLabel = (on: Voice[], mine: Voice) => presetFor(on, mine)?.label(mine) ?? on.join(' · ')

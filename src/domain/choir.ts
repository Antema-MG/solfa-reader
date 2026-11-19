/** Sung ("chanté") choir styles: pure data, no audio. */
export type Vowel = 'a' | 'o' | 'e' | 'i' | 'u'
/** 'recorded' = real voices recorded in the app (missing syllables fall back to 'solfege'). */
export type SungStyle = 'solfege' | 'recorded' | Vowel

export const SUNG_STYLES: { id: SungStyle; label: string; hint?: string }[] = [
  { id: 'recorded', label: 'Chœur enregistré', hint: 'vraies voix' },
  { id: 'solfege', label: 'Solfège chanté', hint: 'do ré mi fa…' },
  { id: 'a', label: 'Ah' }, { id: 'o', label: 'Oh' }, { id: 'e', label: 'É' },
  { id: 'i', label: 'I' }, { id: 'u', label: 'Ou' },
]

export const SUNG_LABEL = Object.fromEntries(
  SUNG_STYLES.map(s => [s.id, s.hint ? s.label : `Chœur « ${s.label} »`]),
) as Record<SungStyle, string>

export const isSung = (x: string): x is SungStyle => SUNG_STYLES.some(s => s.id === x)

/** consonant key (see choirSynth) + vowel (+ optional final consonant). */
export interface Syllable { c?: string; v: Vowel; coda?: string }

/** Relative solfège (d r m f s l t) → sung syllable. Accidentals keep the same syllable. */
const SOLFEGE: Record<string, Syllable> = {
  d: { c: 'd', v: 'o' }, r: { c: 'r', v: 'e' }, m: { c: 'm', v: 'i' }, f: { c: 'f', v: 'a' },
  s: { c: 's', v: 'o', coda: 'l' }, l: { c: 'l', v: 'a' }, t: { c: 's', v: 'i' },
}

export function syllableFor(style: SungStyle, degree: string): Syllable {
  return style === 'solfege' || style === 'recorded' ? SOLFEGE[degree] ?? { v: 'a' } : { v: style }
}

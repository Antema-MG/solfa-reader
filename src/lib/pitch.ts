export const DEGREE_SEMI: Record<string, number> = { d:0, r:2, m:4, f:5, s:7, l:9, t:11 }
export const OCTAVE_OFF:  Record<string, number> = { '':0, "'":12, "''":24, ',': -12, ',,': -24 }
export const PITCH_CLASS: Record<string, number> = {
  C:0,'C#':1,Db:1, D:2,'D#':3,Eb:3, E:4, F:5,'F#':6,Gb:6,
  G:7,'G#':8,Ab:8, A:9,'A#':10,Bb:10, B:11,
}
export const VOICE_BASE_OCTAVE: Record<string, number> = { S:4, A:4, T:3, B:2 }
export const FLAT_KEYS   = new Set(['F','Bb','Eb','Ab','Db'])
export const NAMES_SHARP = ['Do','Do#','Ré','Ré#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si']
export const NAMES_FLAT  = ['Do','Réb','Ré','Mib','Mi','Fa','Solb','Sol','Lab','La','Sib','Si']

export const TONICS: [string, string][] = [
  ['C','Do'],['D','Ré'],['E','Mi'],['F','Fa'],['G','Sol'],['A','La'],['B','Si'],
  ['Bb','Sib'],['Eb','Mib'],['Ab','Lab'],['Db','Réb'],['F#','Fa#'],
]

export function degreeToMidi(
  degree: string, octave: string, chromatic: number,
  tonicLetter: string, voiceOctave: number,
): number {
  const pc       = PITCH_CLASS[tonicLetter] ?? 0
  const tonicMidi = (voiceOctave + 1) * 12 + pc
  return tonicMidi + DEGREE_SEMI[degree] + chromatic + (OCTAVE_OFF[octave] ?? 0)
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function midiToFrenchName(midi: number, tonicLetter: string): string {
  const arr = FLAT_KEYS.has(tonicLetter) ? NAMES_FLAT : NAMES_SHARP
  return arr[((midi % 12) + 12) % 12]
}

// ── Piano placement ───────────────────────────────────────────────────────────

export type NoteSpec = { degree: string; chromatic: number; octave: string }

/**
 * Highest MIDI for `degree` strictly below `midiRef`.
 * Explicit octave override (', ,) shifts both the search target and the result
 * so the result is always < midiRef.
 */
function midiClosestBelow(
  degree: string, chromatic: number, octave: string,
  tonicLetter: string, midiRef: number,
): number {
  const adj    = OCTAVE_OFF[octave] ?? 0
  const pc     = (PITCH_CLASS[tonicLetter] ?? 0) + DEGREE_SEMI[degree] + chromatic
  const effRef = midiRef - adj                         // find base below (midiRef − adj)
  const oct1   = Math.floor((effRef - pc - 1) / 12)   // highest oct1 where oct1*12+pc < effRef
  return oct1 * 12 + pc + adj                          // guaranteed < midiRef
}

/**
 * Compute piano MIDI for all four voices using the proximity rule:
 *  - Soprano: anchor at VOICE_BASE_OCTAVE[S] = 4
 *  - Bass: independent at VOICE_BASE_OCTAVE[B] = 2
 *  - Alto & Tenor: placed below Soprano, ordered by scale degree.
 *      The voice with the higher scale degree goes closest below Soprano;
 *      the other goes closest below that voice.
 *      This preserves natural finger order on the right hand.
 *  - Fallback (no Soprano): fixed base octaves for A and T.
 */
export function computePianoMidis(
  evts: Partial<Record<string, NoteSpec>>,
  tonic: string,
): Partial<Record<string, number>> {
  const midis: Partial<Record<string, number>> = {}
  const s = evts['S'], a = evts['A'], t = evts['T'], b = evts['B']

  const midiS = s
    ? degreeToMidi(s.degree, s.octave, s.chromatic, tonic, VOICE_BASE_OCTAVE['S'])
    : null
  if (midiS != null) midis['S'] = midiS

  if (b) midis['B'] = degreeToMidi(b.degree, b.octave, b.chromatic, tonic, VOICE_BASE_OCTAVE['B'])

  if (midiS != null) {
    const semA = a ? DEGREE_SEMI[a.degree] + a.chromatic : -Infinity
    const semT = t ? DEGREE_SEMI[t.degree] + t.chromatic : -Infinity

    if (a && t) {
      // Higher degree → placed first below Soprano; lower degree → placed below that
      if (semA >= semT) {
        const midA = midiClosestBelow(a.degree, a.chromatic, a.octave, tonic, midiS)
        midis['A'] = midA
        midis['T'] = midiClosestBelow(t.degree, t.chromatic, t.octave, tonic, midA)
      } else {
        const midT = midiClosestBelow(t.degree, t.chromatic, t.octave, tonic, midiS)
        midis['T'] = midT
        midis['A'] = midiClosestBelow(a.degree, a.chromatic, a.octave, tonic, midT)
      }
    } else if (a) {
      midis['A'] = midiClosestBelow(a.degree, a.chromatic, a.octave, tonic, midiS)
    } else if (t) {
      midis['T'] = midiClosestBelow(t.degree, t.chromatic, t.octave, tonic, midiS)
    }
  } else {
    // No Soprano anchor → fall back to fixed base octaves
    if (a) midis['A'] = degreeToMidi(a.degree, a.octave, a.chromatic, tonic, VOICE_BASE_OCTAVE['A'])
    if (t) midis['T'] = degreeToMidi(t.degree, t.octave, t.chromatic, tonic, VOICE_BASE_OCTAVE['T'])
  }

  return midis
}

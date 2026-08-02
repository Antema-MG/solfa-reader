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

/** Pitch class (0–11) of a note spec, ignoring octave. */
function pitchClass(n: NoteSpec): number {
  return (((DEGREE_SEMI[n.degree] + n.chromatic) % 12) + 12) % 12
}

/**
 * Compute piano MIDI for all four voices.
 *  - Soprano: anchor at VOICE_BASE_OCTAVE[S] = 4, always the top note (finger 5).
 *  - Bass: independent at VOICE_BASE_OCTAVE[B] = 2.
 *  - Alto & Tenor: placed in the tightest cluster strictly below Soprano —
 *      each at its highest occurrence < Soprano (minimal right-hand span).
 *      Voice identity is preserved: each keeps its own pitch class, so their
 *      natural pitch order reflects the fingering (no relabelling).
 *  - Chord completion: if an inner right-hand voice doubles the pitch class of
 *      another right-hand voice and the Bass pitch class is missing from the
 *      right hand, the doubling inner voice is reassigned to the Bass pitch
 *      class so the right hand sounds the full chord
 *      (ex: S=d, A=d, T=m, B=s → RH plays d/m/s).
 *  - Fallback (no Soprano): fixed base octaves for A and T (no completion).
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
    // Inner right-hand notes (specs the placement actually uses).
    let specA = a, specT = t

    // Chord completion: replace a doubling inner voice with the Bass pitch class
    // when that class isn't already sounding in the right hand.
    if (b) {
      const pcB = pitchClass(b)
      const pcS = s ? pitchClass(s) : -1
      const rhHasBass = (a && pitchClass(a) === pcB) || (t && pitchClass(t) === pcB)
      if (!rhHasBass) {
        // Bass spec used for the reassigned RH note (octave neutralised — RH
        // placement always searches below Soprano regardless of bass octave).
        const bassRH: NoteSpec = { degree: b.degree, chromatic: b.chromatic, octave: '' }
        if (a && t) {
          const pcA = pitchClass(a), pcT = pitchClass(t)
          if (pcA === pcS || pcA === pcT) specA = bassRH          // Alto doubles → take Bass
          else if (pcT === pcS) specT = bassRH                    // Tenor doubles S → take Bass
        } else if (a && pcS >= 0 && pitchClass(a) === pcS) {
          specA = bassRH                                          // lone Alto doubles S
        } else if (t && pcS >= 0 && pitchClass(t) === pcS) {
          specT = bassRH                                          // lone Tenor doubles S
        }
      }
    }

    if (specA && specT) {
      // Tightest cluster: each inner voice at its highest occurrence strictly
      // below Soprano. Voice identity is preserved (Alto keeps Alto's pitch),
      // so their natural pitch order already reflects the right-hand fingering.
      midis['A'] = midiClosestBelow(specA.degree, specA.chromatic, specA.octave, tonic, midiS)
      midis['T'] = midiClosestBelow(specT.degree, specT.chromatic, specT.octave, tonic, midiS)
    } else if (specA) {
      midis['A'] = midiClosestBelow(specA.degree, specA.chromatic, specA.octave, tonic, midiS)
    } else if (specT) {
      midis['T'] = midiClosestBelow(specT.degree, specT.chromatic, specT.octave, tonic, midiS)
    }
  } else {
    // No Soprano anchor → fall back to fixed base octaves
    if (a) midis['A'] = degreeToMidi(a.degree, a.octave, a.chromatic, tonic, VOICE_BASE_OCTAVE['A'])
    if (t) midis['T'] = degreeToMidi(t.degree, t.octave, t.chromatic, tonic, VOICE_BASE_OCTAVE['T'])
  }

  return midis
}

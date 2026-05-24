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

/**
 * Pure curriculum for the "Méthode" track — a progressive, Méthode-Rose-style
 * piano course in FIXED Do (Do central = MIDI 60). Notes are absolute MIDI so
 * the microphone (absolute pitch) can validate them. Monophonic only.
 */

export const MIDDLE_C = 60 // Do3 / Do central

/** Central five-finger positions: both thumbs on Do central. */
export const RIGHT_POS = [60, 62, 64, 65, 67] // Do Ré Mi Fa Sol  (fingers 1..5)
export const LEFT_POS  = [60, 59, 57, 55, 53] // Do Si La Sol Fa   (fingers 1..5, descending)

export type Hand = 'L' | 'R'

export interface ExNote {
  midi: number
  hand: Hand
  finger: 1 | 2 | 3 | 4 | 5
  lyric?: string
}

export interface MethodLesson {
  id: string
  title: string
  hint: string
  exercise: ExNote[]
}

const R = (midi: number, finger: ExNote['finger'], lyric?: string): ExNote => ({ midi, hand: 'R', finger, lyric })
const L = (midi: number, finger: ExNote['finger'], lyric?: string): ExNote => ({ midi, hand: 'L', finger, lyric })

// ── ABC notation (real engraved staff via abcjs) ─────────────
const PC_LETTER: Record<number, string> = { 0: 'C', 2: 'D', 4: 'E', 5: 'F', 7: 'G', 9: 'A', 11: 'B' }

/** MIDI (naturals only) → an ABC pitch token. Octave 4 (60–71) = bare capital. */
function midiToAbc(midi: number): string {
  const letter = PC_LETTER[((midi % 12) + 12) % 12] ?? 'C'
  const oct = Math.floor(midi / 12) - 1 // 60 → 4
  if (oct >= 5) return letter.toLowerCase() + "'".repeat(oct - 5)
  if (oct <= 3) return letter + ','.repeat(4 - oct)
  return letter
}

/**
 * Build an ABC tune for a lesson — the real solfège staff. Clef follows the
 * dominant hand (treble for right, bass for left); each note carries its
 * fingering as an ABC decoration. Quarter notes for this MVP.
 */
export function lessonToAbc(lesson: MethodLesson): string {
  const leftCount = lesson.exercise.filter(n => n.hand === 'L').length
  const clef = leftCount > lesson.exercise.length / 2 ? 'bass' : 'treble'
  const body = lesson.exercise.map(n => `!${n.finger}!${midiToAbc(n.midi)}`).join(' ')
  return `X:1\nL:1/4\nM:none\nK:C clef=${clef}\n${body} |`
}

export const METHOD: MethodLesson[] = [
  {
    id: 'm1', title: '1 · Position & Do',
    hint: 'Les deux pouces sur Do central. Main droite, doigt 1 (pouce). Joue Do plusieurs fois.',
    exercise: [R(60, 1, 'Do'), R(60, 1, 'Do'), R(60, 1, 'Do'), R(60, 1, 'Do')],
  },
  {
    id: 'm2', title: '2 · Do – Ré',
    hint: 'Main droite : pouce (1) sur Do, index (2) sur Ré. Va et viens.',
    exercise: [R(60, 1, 'Do'), R(62, 2, 'Ré'), R(60, 1, 'Do'), R(62, 2, 'Ré'), R(60, 1, 'Do')],
  },
  {
    id: 'm3', title: '3 · Do – Ré – Mi',
    hint: 'Ajoute le majeur (3) sur Mi. Monte puis redescends.',
    exercise: [R(60, 1, 'Do'), R(62, 2, 'Ré'), R(64, 3, 'Mi'), R(62, 2, 'Ré'), R(60, 1, 'Do')],
  },
  {
    id: 'm4', title: '4 · Jusqu’à Sol',
    hint: 'Les 5 doigts de la main droite : Do Ré Mi Fa Sol (1 2 3 4 5).',
    exercise: [R(60, 1, 'Do'), R(62, 2, 'Ré'), R(64, 3, 'Mi'), R(65, 4, 'Fa'), R(67, 5, 'Sol')],
  },
  {
    id: 'm5', title: '5 · Petite mélodie',
    hint: 'Main droite. Mi Ré Do Ré Mi Mi Mi — une mélodie connue !',
    exercise: [R(64, 3, 'Mi'), R(62, 2, 'Ré'), R(60, 1, 'Do'), R(62, 2, 'Ré'),
               R(64, 3, 'Mi'), R(64, 3, 'Mi'), R(64, 3, 'Mi')],
  },
  {
    id: 'm6', title: '6 · Main gauche',
    hint: 'Main gauche : pouce (1) sur Do central, puis descends Si (2), La (3).',
    exercise: [L(60, 1, 'Do'), L(59, 2, 'Si'), L(57, 3, 'La'), L(59, 2, 'Si'), L(60, 1, 'Do')],
  },
  {
    id: 'm7', title: '7 · Les deux mains',
    hint: 'Alterne : une note main droite, une note main gauche.',
    exercise: [R(60, 1, 'Do'), L(60, 1, 'Do'), R(64, 3, 'Mi'), L(57, 3, 'La'),
               R(67, 5, 'Sol'), L(53, 5, 'Fa')],
  },
  {
    id: 'm8', title: '8 · Do à Do’ (octave)',
    hint: 'La gamme entière, main droite, en passant le pouce sous le majeur après Mi.',
    exercise: [R(60, 1, 'Do'), R(62, 2, 'Ré'), R(64, 3, 'Mi'), R(65, 1, 'Fa'),
               R(67, 2, 'Sol'), R(69, 3, 'La'), R(71, 4, 'Si'), R(72, 5, 'Do')],
  },
]

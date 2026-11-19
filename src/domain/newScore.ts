/**
 * Blank score generator: the "Nouvelle partition" form → a valid .msolfa
 * skeleton whose cells already match the chosen metre (N beats per measure,
 * every cell a rest), split into commented phrase blocks per CLAUDE.md.
 */

export interface Meter { num: number; den: number; label: string; hint: string }

/** Common metres, in the order a choir director meets them. */
export const METERS: Meter[] = [
  { num: 4, den: 4, label: '4/4', hint: '4 temps' },
  { num: 3, den: 4, label: '3/4', hint: '3 temps, valse' },
  { num: 2, den: 4, label: '2/4', hint: '2 temps, marche' },
  { num: 6, den: 8, label: '6/8', hint: '6 croches, 2 pulsations' },
  { num: 6, den: 4, label: '6/4', hint: '6 temps' },
]

export interface NewScore {
  title: string
  composer: string
  key: string
  meter: Meter
  tempo: number
  phrases: number
  measuresPerPhrase: number
}

const VOICES = ['S', 'A', 'T', 'B'] as const

export function newScoreText(o: NewScore): string {
  const measure = Array(o.meter.num).fill('0').join(' : ')
  const line = Array(o.measuresPerPhrase).fill(measure).join(' | ')
  const head = [
    `Key: ${o.key}`,
    `Mesure: ${o.meter.num}/${o.meter.den}`,
    `Titre: ${o.title.trim() || 'Nouvelle partition'}`,
    `Compositeur: ${o.composer.trim() || '-'}`,
    `Tempo: ${o.tempo} BPM`,
  ]
  const blocks = Array.from({ length: o.phrases }, (_, i) =>
    [`// Phrase ${i + 1}`, ...VOICES.map(v => `${v}. || ${line} ||`)].join('\n'))
  return [...head, '', ...blocks.flatMap(b => [b, ''])].join('\n')
}

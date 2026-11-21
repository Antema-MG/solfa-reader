import type { InstrumentId } from '../types/music'

/** Short list of instruments offered in the quick pickers, and their short labels. */
export const INSTRUMENTS: InstrumentId[] = ['church_organ', 'acoustic_grand_piano', 'choir_aahs', 'string_ensemble_1', 'flute', 'trumpet']
export const SHORT_SOUND: Partial<Record<InstrumentId, string>> = {
  church_organ: 'Orgue', drawbar_organ: 'Orgue', acoustic_grand_piano: 'Piano', choir_aahs: 'Chœur (samples)', string_ensemble_1: 'Cordes', flute: 'Flûte', trumpet: 'Trompette',
}

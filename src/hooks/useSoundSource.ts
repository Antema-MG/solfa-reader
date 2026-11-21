import { usePlayer } from '../state/PlayerContext'
import { SUNG_STYLES, SUNG_LABEL, isSung, type SungStyle } from '../domain/choir'
import { INSTRUMENT_BY_ID, type InstrumentId } from '../types/music'
import { INSTRUMENTS, SHORT_SOUND } from '../domain/sounds'

// Last sound of each family, so Voix ⇄ Instrument comes back to what you had.
const memo: { voice: SungStyle; inst: InstrumentId } = { voice: 'recorded', inst: 'church_organ' }

export const soundLabel = (id: string) => (isSung(id) ? SUNG_LABEL[id] : SHORT_SOUND[id as InstrumentId] ?? INSTRUMENT_BY_ID[id as InstrumentId]?.label ?? id)

/** Voix ⇄ Instrument, and ‹ › through the sounds of the current family. */
export function useSoundSource() {
  const { sung, instrumentId, setSung, setInstrument } = usePlayer()
  const family: 'voice' | 'instrument' = sung ? 'voice' : 'instrument'
  const current: string = sung ?? instrumentId
  if (sung) memo.voice = sung; else memo.inst = instrumentId
  const list: string[] = family === 'voice' ? SUNG_STYLES.map(s => s.id) : INSTRUMENTS.includes(instrumentId) ? INSTRUMENTS : [instrumentId, ...INSTRUMENTS]
  const set = (id: string) => (isSung(id) ? setSung(id) : setInstrument(id as InstrumentId))
  return {
    family, current, label: soundLabel(current), list: list.map(id => ({ id, label: soundLabel(id) })),
    setFamily: (f: 'voice' | 'instrument') => { if (f !== family) f === 'voice' ? setSung(memo.voice) : setInstrument(memo.inst) },
    set,
    step: (d: 1 | -1) => set(list[(list.indexOf(current) + d + list.length) % list.length]),
  }
}

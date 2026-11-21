import { usePlayer } from '../../state/PlayerContext'
import { SoundBar, VoiceMixBar } from './SoundBar'
import { ReadBar, ReadToggle } from './ReadingView'
import PhraseList from '../Score/PhraseList'
import {
  ACCENT, CUR, DisplayMenu, INK, KeyPill, PianoStrip, TEXT2, TempoPill, TopProgress, TransportRow,
  usePianoPref,
} from './controls'
import type { Voice } from '../../types'
import type { Back } from './Views'

const NAME: Record<Voice, string> = { S: 'Soprano', A: 'Alto', T: 'Ténor', B: 'Basse' }

function useHeaderText() {
  const { score, currentBeat } = usePlayer()
  const m = score?.metadata
  const bpm = score?.beatsPerMeasure ?? 3
  const total = score?.measures.length ?? 0
  const cur = Math.min(total, Math.floor(currentBeat / bpm) + 1)
  return {
    title: m?.title && m.title !== '-' ? m.title : 'Sans titre',
    sub: m ? `${m.numerator}/${m.denominator} · mes. ${cur} / ${total}` : '',
    composer: m?.composer && m.composer !== '-' ? m.composer : '',
  }
}

/** Phone portrait: header · phrases · [settings icons · piano · progress · transport]. */
export function PhoneListen({ goLibrary, back }: { goLibrary?: () => void; back?: Back }) {
  const { score } = usePlayer()
  const { title, sub } = useHeaderText()
  const [piano, togglePiano] = usePianoPref('phone')
  return (
    <>
      <header style={{ flex: 'none', padding: 'calc(env(safe-area-inset-top) + 10px) 12px 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
        {back
          ? <button type="button" onClick={back.go} aria-label={`Retour : ${back.label}`} style={{ width: 44, height: 44, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
            </button>
          : <span style={{ width: 44, flex: 'none' }} />}
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
          <span style={{ fontSize: 12, color: TEXT2 }}>{sub}</span>
        </div>
        <ReadToggle /><DisplayMenu piano={piano} togglePiano={togglePiano} />
      </header>
      {!score
        ? <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24, color: TEXT2 }}>
            <div><p style={{ marginBottom: 12 }}>Aucune partition ouverte.</p>
              {goLibrary && <button type="button" onClick={goLibrary} style={{ height: 40, padding: '0 20px', border: 'none', borderRadius: 20, background: INK, color: '#fff', fontSize: 13, fontWeight: 700 }}>Ouvrir la bibliothèque</button>}</div>
          </div>
        : <PhraseList />}
      <div style={{ position: 'relative', flex: 'none' }}><TopProgress /></div>
      {piano && <div style={{ flex: 'none', padding: '6px 10px 0', background: '#FFFFFF' }}><PianoStrip height={86} zoom={0.62} /></div>}
      <ReadBar play />
    </>
  )
}

/** Web: title + key/tempo/⋯ on one line, transport card, phrases, piano card. */
export function DesktopListen() {
  const { title, sub, composer } = useHeaderText()
  const { score } = usePlayer()
  const [piano, togglePiano] = usePianoPref('web')
  const { currentBeat } = usePlayer()
  const bpm = score?.beatsPerMeasure ?? 3
  const total = score?.measures.length ?? 0
  const cur = Math.min(total, Math.floor(currentBeat / bpm) + 1)
  if (!score) return <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: TEXT2 }}>Choisis une partition dans la liste à gauche.</div>
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
          <span style={{ fontSize: 13, color: TEXT2 }}>{[composer, sub.split(' · ')[0]].filter(Boolean).join(' · ')}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <KeyPill /><TempoPill /><DisplayMenu piano={piano} togglePiano={togglePiano} />
        </div>
      </div>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '0 1 440px', minWidth: 300 }}><SoundBar /></div>
        <VoiceMixBar padding="0" />
      </div>
      <div role="group" aria-label="Lecture" style={{ flex: 'none', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 10, background: '#FFFFFF', borderRadius: 18, padding: '10px 14px' }}>
        <TopProgress color={ACCENT} />
        <div style={{ width: 300, flex: 'none' }}><TransportRow piano={piano} togglePiano={togglePiano} /></div>
        <span style={{ flex: 1, textAlign: 'right', fontSize: 12, color: TEXT2, fontVariantNumeric: 'tabular-nums' }}>Mesure {cur} / {total}</span>
      </div>
      <PhraseList />
      {piano && <section aria-label="Piano" style={{ flex: 'none', background: '#FFFFFF', borderRadius: 18, padding: 8 }}><PianoStrip height={124} zoom={0.9} /></section>}
    </div>
  )
}

export { CUR, NAME }

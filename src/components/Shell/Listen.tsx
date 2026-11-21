import { useState } from 'react'
import { usePlayer } from '../../state/PlayerContext'
import { SoundBar, VoiceMixBar } from './SoundBar'
import { TONICS } from '../../domain/pitch'
import PhraseList from '../Score/PhraseList'
import {
  ACCENT, CUR, ClefsIcon, DisplayMenu, INK, KeyPill, PianoStrip, PickerSheet, SpeakerIcon, TEXT2, TempoPill, TopProgress, TransportRow,
  tonicName, usePianoPref, useTonicLabel, type PickOpt,
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

type Pick = null | 'tempo' | 'ton'

/** Phone portrait: header · voice chips · phrases · [chips · piano · progress · transport]. */
export function PhoneListen({ goLibrary, back }: { goLibrary?: () => void; back?: Back }) {
  const { tempo, setTempo, tonic, setTonic, score, playKey, playClefs } = usePlayer()
  const { title, sub } = useHeaderText()
  const [piano, togglePiano] = usePianoPref('phone')
  const tonLabel = useTonicLabel()
  const [pick, setPick] = useState<Pick>(null)
  const close = () => setPick(null)
  const orig = score?.metadata.tempo
  const tempos = [...new Set([60, 70, 80, 90, 100, 110, tempo, ...(orig ? [orig] : [])])].sort((a, b) => a - b)

  const sheet = (() => {
    if (pick === 'tempo') return { title: 'TEMPO', opts: tempos.map<PickOpt>(t => ({ value: String(t), label: `${t} BPM${t === orig ? ' · original' : ''}`, on: t === tempo })), act: (v: string) => setTempo(+v) }
    if (pick === 'ton') return { title: 'TONIQUE (do =)', opts: TONICS.map<PickOpt>(([k, l]) => ({ value: k, label: tonicName(l) + (k === score?.metadata.key ? ' · original' : ''), on: k === tonic })), act: (v: string) => { setTonic(v); window.setTimeout(playKey, 30) } }
    return null
  })()

  const chip = { flex: 1, minWidth: 0, height: 30, border: 'none', borderRadius: 15, background: '#F5F5F7', fontSize: 12, fontWeight: 600, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const
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
        <DisplayMenu piano={piano} togglePiano={togglePiano} />
      </header>
      <VoiceMixBar />
      {!score
        ? <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24, color: TEXT2 }}>
            <div><p style={{ marginBottom: 12 }}>Aucune partition ouverte.</p>
              {goLibrary && <button type="button" onClick={goLibrary} style={{ height: 40, padding: '0 20px', border: 'none', borderRadius: 20, background: INK, color: '#fff', fontSize: 13, fontWeight: 700 }}>Ouvrir la bibliothèque</button>}</div>
          </div>
        : <PhraseList />}
      <section style={{ position: 'relative', flex: 'none', padding: '8px 14px 6px', background: '#FFFFFF', borderTop: '1px solid #E5E5EA', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SoundBar />
        <div aria-label="Réglages de lecture" style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={() => setPick('tempo')} style={chip}>{tempo} BPM</button>
          <button type="button" onClick={() => setPick('ton')} style={{ ...chip, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><SpeakerIcon size={13} /><span>do = {tonLabel}</span></button>
        </div>
        {piano && <PianoStrip height={86} zoom={0.62} />}
        <TopProgress />
        <TransportRow piano={piano} togglePiano={togglePiano} />
      </section>
      {sheet && (
        <PickerSheet title={sheet.title} options={sheet.opts} onClose={close} onPick={v => { sheet.act(v); close() }}
          top={pick === 'ton' ? (
            <div style={{ display: 'flex', gap: 8, margin: '2px 0 8px' }}>
              <button type="button" onClick={playKey} style={{ flex: 1, height: 44, border: 'none', borderRadius: 12, background: INK, color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <SpeakerIcon size={16} on /><span>Le do · {tonLabel}</span>
              </button>
              <button type="button" onClick={playClefs} style={{ flex: 1, height: 44, border: 'none', borderRadius: 12, background: '#F2F2F7', color: INK, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <ClefsIcon size={18} /><span>Les clés</span>
              </button>
            </div>) : undefined} />
      )}
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

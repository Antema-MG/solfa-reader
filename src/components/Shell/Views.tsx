import { useEffect, type CSSProperties } from 'react'
import { Icon } from './Icon'
import type { Voice } from '../../types'
import { usePlayer } from '../../state/PlayerContext'
import { useEditor } from '../../state/EditorContext'
import { usePrefs, type MySound } from '../../state/PrefsContext'
import type { InstrumentId } from '../../types/music'
import PhraseList from '../Score/PhraseList'
import RhythmToolbar from '../Editor/RhythmToolbar'
import { Combo, DisplayMenu, SoundPicker, Transport, VoiceBar, pill, useDesktop } from './ui'
import type { SungStyle } from '../../domain/choir'
import { loadTakes } from '../../services/recordedChoir'
import { DesktopListen, PhoneListen } from './Listen'
import PartitionPhone from './PartitionPhone'
import { VCOLOR } from './controls'
import { ReadBar } from './ReadingView'
import { SUNG_STYLES } from '../../domain/choir'
import { INSTRUMENT_BY_ID } from '../../types/music'
import { INSTRUMENTS as INSTRUMENT_CHOICES, SHORT_SOUND } from './ui'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']
const COLOR: Record<Voice, string> = { S: 'var(--s)', A: 'var(--a)', T: 'var(--t)', B: 'var(--b)' }
const NAME: Record<Voice, string> = { S: 'Soprano', A: 'Alto', T: 'Ténor', B: 'Basse' }

/** Gives "ma voix" its own instrument (piano, choir...), the others keep the main one. */
export function useMySound() {
  const { mySound, myVoice, singers, reverb, voiceSrc } = usePrefs()
  const { setVoiceInstrument, setChoirFx } = usePlayer()
  useEffect(() => {
    VOICES.forEach(v => setVoiceInstrument(v, (voiceSrc[v] ?? (v === myVoice && mySound !== 'same' ? mySound : null)) as InstrumentId | SungStyle | null))
  }, [mySound, myVoice, voiceSrc, setVoiceInstrument])
  useEffect(() => { setChoirFx({ singers, reverb }) }, [singers, reverb, setChoirFx])
  const { setTakes } = usePlayer()
  useEffect(() => { void loadTakes().then(setTakes) }, [setTakes])
}

export const SOUNDS: { value: MySound; label: string }[] = [
  { value: 'same', label: 'Comme les autres voix' },
  { value: 'recorded', label: 'Chœur enregistré (vraies voix)' },
  { value: 'solfege', label: 'Solfège chanté (do, ré, mi…)' },
  { value: 'a', label: 'Chœur réaliste « Ah »' },
  { value: 'acoustic_grand_piano', label: 'Piano' },
  { value: 'synth_choir', label: 'Voix synthétisée' },
  { value: 'choir_aahs', label: 'Chœur « Ahhh »' },
  { value: 'voice_oohs', label: 'Chœur « Ohhh »' },
]

/** Where the back arrow leads (mobile only): label of the previous screen + action. */
export type Back = { label: string; go: () => void }

function Header({ title, sub, right, back }: { title: string; sub?: string; right?: React.ReactNode; back?: Back }) {
  // Minimal back: a bare chevron (44px tap target) left of the title; the target screen is in the label.
  return (
    <header style={{ flex: 'none', padding: back ? '10px 12px 8px 4px' : '14px 12px 8px 16px', display: 'flex', alignItems: 'center', gap: back ? 2 : 8 }}>
      {back && (
        <button type="button" onClick={back.go} aria-label={`Retour : ${back.label}`} title={back.label} style={{
          flex: 'none', width: 40, height: 44, padding: 0, border: 'none', background: 'none',
          display: 'grid', placeItems: 'center', color: 'var(--accent-ink)',
        }}><Icon name="chevronLeft" size={26} /></button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{sub}</div>}
      </div>
      {right}
    </header>
  )
}

function NoScore({ go }: { go?: () => void }) {
  return (
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24, color: 'var(--text2)' }}>
      <div>
        <p style={{ marginBottom: 12 }}>{go ? 'Aucune partition ouverte.' : 'Choisis une partition dans la liste à gauche.'}</p>
        {go && <button type="button" onClick={go} style={{ ...pill(true, 40), padding: '0 20px' }}>Ouvrir la bibliothèque</button>}
      </div>
    </div>
  )
}

function useMeta() {
  const { score, error } = usePlayer()
  const m = score?.metadata
  return {
    score, error,
    title: m?.title && m.title !== '-' ? m.title : 'Sans titre',
    sub: m ? `${m.composer && m.composer !== '-' ? m.composer + ' · ' : ''}${m.numerator}/${m.denominator} · ${score!.measures.length} mesures` : undefined,
  }
}

function Progress() {
  const { score, currentBeat, seekTo } = usePlayer()
  const pct = score ? (currentBeat / score.totalBeats) * 100 : 0
  return (
    <div onClick={e => {
      if (!score) return
      const r = e.currentTarget.getBoundingClientRect()
      seekTo(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * score.totalBeats)
    }} style={{ height: 10, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
      <div style={{ flex: 1, height: 2, borderRadius: 1, background: 'var(--bg4)', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${pct}%`, borderRadius: 1, background: 'var(--text2)' }} />
      </div>
    </div>
  )
}

/** Écoute: phone portrait (chips + compact transport) or web (key/tempo pills, transport card, piano card). */
export function ListenView({ goLibrary, back }: { goLibrary?: () => void; back?: Back }) {
  const desktop = useDesktop()
  return desktop ? <DesktopListen /> : <PhoneListen goLibrary={goLibrary} back={back} />
}

/** Partition: reading view, with edit mode (existing grid editor). */
export function ScoreScreen({ goLibrary, goListen, back }: { goLibrary?: () => void; goListen?: () => void; back?: Back }) {
  const { score, error, title, sub } = useMeta()
  const { isEditing, enter, exit } = useEditor()
  const desktop = useDesktop()
  if (!desktop) return <PartitionPhone onEdit={enter} goListen={goListen} goLibrary={goLibrary} />
  if (!score) return <><Header title="Partition" back={back} /><NoScore go={goLibrary} />{error && <p style={{ color: 'var(--red-btn)', padding: 16 }}>{error}</p>}</>
  return (
    <>
      <Header title={title} sub={sub} back={back} right={<>
        {desktop && !isEditing && <VoiceBar />}
        <button type="button" onClick={isEditing ? exit : enter} style={{ ...pill(isEditing, 36), marginRight: 2, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name={isEditing ? 'check' : 'pencil'} size={16} />{isEditing ? 'Terminer' : 'Éditer'}</button>
        <DisplayMenu />
      </>} />
      {isEditing ? (
        <><PhraseList editable /><RhythmToolbar /></>
      ) : (
        <>
          {!desktop && <div style={{ flex: 'none', padding: '0 16px 8px' }}><VoiceBar /></div>}
          <PhraseList />
          <div style={{ flex: 'none', padding: '4px 16px 6px', background: 'var(--bg2)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Progress /><Transport />
          </div>
        </>
      )}
    </>
  )
}

/**
 * Chorale panel, organised by task (proposal A):
 *  - Ma partie: which voice I sing, how I listen, the sound of my voice
 *  - Le chœur: choir effects and recording real voices (shown when a sung sound is used)
 * Tempo · son · tonique sit next to S A T B above the score: never repeated here.
 */
const caption: CSSProperties = { fontSize: 11, fontWeight: 700, color: '#6E6E73', letterSpacing: '0.06em', textTransform: 'uppercase' }
const tick = (on: boolean): CSSProperties => on
  ? { flex: 'none', width: 20, height: 20, borderRadius: 10, background: '#1D1D1F', boxShadow: 'inset 0 0 0 6px #1D1D1F, inset 0 0 0 20px #FFFFFF' }
  : { flex: 'none', width: 20, height: 20, borderRadius: 10, border: '1.5px solid #AEAEB2', boxSizing: 'border-box' }
const radioRow = (i: number, min: number): CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 12, minHeight: min, padding: '4px 12px', border: 'none', background: 'transparent', color: '#1D1D1F', width: '100%',
  borderTop: i ? '1px solid #E5E5EA' : undefined, textAlign: 'left',
})

/** Web right column: je chante · écoute · son · son de ma voix (same controls as the design's web board). */
function WebChoirPanel() {
  const { myVoice, mySound, set } = usePrefs()
  const { sung, instrumentId, setSung, setInstrument } = usePlayer()
  const voices = !!sung
  const pillBtn = (on: boolean): CSSProperties => ({ height: 32, padding: '0 12px', borderRadius: 16, border: 'none', fontSize: 12.5, fontWeight: 600, background: on ? '#1D1D1F' : '#F2F2F7', color: on ? '#FFFFFF' : '#1D1D1F' })
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={caption}>Je chante</span>
      <div role="radiogroup" aria-label="Je chante" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
        {VOICES.map(v => {
          const on = myVoice === v
          return <button key={v} type="button" role="radio" aria-checked={on} aria-label={NAME[v]} onClick={() => set('myVoice', v)}
            style={{ height: 44, borderRadius: 10, border: 'none', fontSize: 16, fontWeight: 800, background: on ? VCOLOR[v] : '#F2F2F7', color: on ? '#FFFFFF' : VCOLOR[v] }}>{v}</button>
        })}
      </div>
      <span style={caption}>Sons {voices ? 'de voix' : 'd’instruments'}</span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {voices
          ? SUNG_STYLES.map(x => <button key={x.id} type="button" aria-pressed={sung === x.id} onClick={() => setSung(x.id)} style={pillBtn(sung === x.id)}>{x.hint ? x.label : `« ${x.label} »`}</button>)
          : INSTRUMENT_CHOICES.map(id => <button key={id} type="button" aria-pressed={instrumentId === id} onClick={() => setInstrument(id)} style={pillBtn(instrumentId === id)}>{SHORT_SOUND[id] ?? INSTRUMENT_BY_ID[id]?.label ?? id}</button>)}
      </div>
      <SoundPicker effectsOnly />
      <span style={caption}>Son de ma voix</span>
      <div role="radiogroup" aria-label="Son de ma voix" style={{ display: 'flex', flexDirection: 'column', borderRadius: 12, background: '#F2F2F7' }}>
        {SOUNDS.map((o, i) => (
          <button key={o.value} type="button" role="radio" aria-checked={mySound === o.value} onClick={() => set('mySound', o.value)} style={radioRow(i, 44)}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{o.label}</span><span style={tick(mySound === o.value)} />
          </button>
        ))}
      </div>
    </div>
  )
}

export function ChoirPanel() {
  const { myVoice, mySound, set } = usePrefs()
  const desktop = useDesktop()
  if (desktop) return <WebChoirPanel />
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 12px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section aria-label="Ma partie">
        <div className="ios-caption">Ma partie</div>
        <div className="ios-group">
          <div className="ios-row stack">
            <span>Je chante</span>
            <div role="radiogroup" aria-label="Je chante" className="ios-seg">
              {VOICES.map(v => (
                <button key={v} type="button" role="radio" aria-checked={myVoice === v} onClick={() => set('myVoice', v)}
                  style={{ color: myVoice === v ? COLOR[v] : undefined }}>{NAME[v]}</button>
              ))}
            </div>
          </div>
          {desktop
            ? <Combo row label="Son de ma voix" value={mySound} onPick={v => set('mySound', v as MySound)} options={SOUNDS.map(o => ({ value: o.value, label: o.label }))} />
            : <label className="ios-row">
                <span style={{ flex: 'none' }}>Son de ma voix</span>
                <select value={mySound} onChange={e => set('mySound', e.target.value as MySound)} style={{ flex: 1 }}>
                  {SOUNDS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>}
        </div>
      </section>

      <SoundPicker effectsOnly />

    </div>
  )
}

export function ChoirView({ goLibrary, back }: { goLibrary?: () => void; back?: Back }) {
  const { score, title } = useMeta()
  const { myVoice } = usePrefs()
  if (!score) return <><Header title="Chorale" back={back} /><NoScore go={goLibrary} /></>
  return (
    <>
      <Header title="Répétition" sub={`${title} · ${NAME[myVoice]}`} back={back} />
      <ChoirPanel />
      <ReadBar play />
    </>
  )
}

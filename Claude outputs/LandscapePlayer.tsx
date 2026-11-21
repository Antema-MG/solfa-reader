import { useEffect, useState, type CSSProperties } from 'react'
import type { Voice } from '../../types'
import { usePlayer } from '../../state/PlayerContext'
import { useEditor } from '../../state/EditorContext'
import { usePrefs, type ListenMode } from '../../state/PrefsContext'
import { SUNG_STYLES } from '../../domain/choir'
import { INSTRUMENT_BY_ID } from '../../types/music'
import { loadTakes } from '../../services/recordedChoir'
import PhraseList from '../Score/PhraseList'
import LectureList from '../Score/LectureList'
import EditorGrid from '../Editor/EditorGrid'
import RhythmToolbar from '../Editor/RhythmToolbar'
import { Icon } from './Icon'
import { INSTRUMENTS as INSTRUMENT_CHOICES, SHORT_SOUND } from './ui'
import { ACCENT, INK, IosSwitch, KeyPill, MiniPiano, NextIcon, PauseIcon, PlayIcon, PrevIcon, TEXT2, TempoPill, VCOLOR, VOICES } from './controls'

const NAME: Record<Voice, string> = { S: 'Soprano', A: 'Alto', T: 'Ténor', B: 'Basse' }
type Tab = 'son' | 'voix' | 'vue'
const TABS: [Tab, string][] = [['son', 'Son'], ['voix', 'Pupitres'], ['vue', 'Vue']]
const MODES: [ListenMode, string][] = [['tutti', 'Tutti'], ['solo', 'Ma voix'], ['without', 'Sans moi']]
const HINT: Partial<Record<ListenMode, string>> = { tutti: 'Tous jouent, ta voix en gras.', solo: 'Ta voix seule, pour l’apprendre.', without: 'Ta voix est coupée : à toi de chanter.' }

const seg = (on: boolean): CSSProperties => ({
  height: 34, border: 'none', borderRadius: 8, padding: 0, fontSize: 12.5, color: INK, fontWeight: on ? 700 : 500, width: '100%',
  background: on ? '#FFFFFF' : 'transparent', boxShadow: on ? '0 1px 2px rgba(0,0,0,0.12)' : undefined,
})
const chip = (on: boolean, h: number): CSSProperties => ({
  height: h, border: 'none', borderRadius: 10, padding: '0 2px', fontSize: 12.5, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  background: on ? INK : '#F2F2F7', color: on ? '#FFFFFF' : INK,
})
const caption: CSSProperties = { fontSize: 11, fontWeight: 700, color: TEXT2, letterSpacing: '0.06em', textTransform: 'uppercase' }

/** Right drawer: Son · Pupitres · Vue. */
function Dock({ onRecord }: { onRecord?: () => void }) {
  const [tab, setTab] = useState<Tab>('son')
  const { sung, instrumentId, setSung, setInstrument, muted, solo, toggleMute, toggleSolo } = usePlayer()
  const { myVoice, mode, lyrics, big, pianoL, set } = usePrefs()
  const [taken, setTaken] = useState(0)
  const [lastSung, setLastSung] = useState<NonNullable<typeof sung>>('recorded')
  useEffect(() => { void loadTakes().then(t => setTaken(Object.keys(t).length)) }, [])
  const voices = !!sung
  const audible = (v: Voice) => (solo.size ? solo.has(v) : !muted[v])
  const rowSw = (on: boolean): CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, border: 'none', borderTop: '1px solid #EFEFF4', background: 'transparent', padding: 0, color: INK, textAlign: 'left' })
  const PRESETS: [string, () => void][] = [
    ['Chanteur', () => { set('mode', 'tutti'); set('pianoL', false); set('lyrics', true); set('big', true); setSung(lastSung) }],
    ['Musicien', () => { set('mode', 'tutti'); set('pianoL', true); set('lyrics', false); set('big', false); setInstrument('acoustic_grand_piano') }],
    ['Chef de chœur', () => { set('mode', 'tutti'); set('pianoL', false); set('lyrics', true); set('big', false); setSung(lastSung) }],
  ]
  return (
    <aside aria-label="Réglages rapides" style={{ flex: 'none', width: 232, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 2, minHeight: 0 }}>
      <div role="tablist" aria-label="Réglages" style={{ flex: 'none', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2, padding: 2, borderRadius: 10, background: '#E8E8ED' }}>
        {TABS.map(([id, l]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={seg(tab === id)}>{l}</button>)}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', borderRadius: 14, background: '#FFFFFF', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tab === 'son' && <>
          <div role="radiogroup" aria-label="Ce que j'entends" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2, padding: 2, borderRadius: 10, background: '#F2F2F7' }}>
            <button type="button" role="radio" aria-checked={voices} onClick={() => setSung(sung ?? lastSung)} style={seg(voices)}>Voix</button>
            <button type="button" role="radio" aria-checked={!voices} onClick={() => { if (sung) setLastSung(sung); setInstrument(instrumentId) }} style={seg(!voices)}>Instruments</button>
          </div>
          {voices ? <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4 }}>
              {SUNG_STYLES.filter(x => x.hint).map(x => (
                <button key={x.id} type="button" aria-pressed={sung === x.id} onClick={() => setSung(x.id)} style={chip(sung === x.id, 46)}>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{x.id === 'recorded' ? 'Vraies voix' : 'Do ré mi'}</span>
                  <span style={{ fontSize: 10.5, opacity: 0.75 }}>{x.id === 'recorded' ? 'chœur enregistré' : 'solfège chanté'}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 4 }}>
              {SUNG_STYLES.filter(x => !x.hint).map(x => <button key={x.id} type="button" aria-pressed={sung === x.id} onClick={() => setSung(x.id)} style={chip(sung === x.id, 36)}>{x.label}</button>)}
            </div>
            {onRecord && <button type="button" onClick={onRecord} style={{ border: 'none', background: 'transparent', padding: '0 2px', color: ACCENT, fontSize: 11.5, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
              <span>Chœur enregistré · {taken} / 28 prises</span><span aria-hidden="true">›</span></button>}
          </> : <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4 }}>
              {INSTRUMENT_CHOICES.map(id => <button key={id} type="button" aria-pressed={instrumentId === id} onClick={() => setInstrument(id)} style={chip(instrumentId === id, 40)}>{SHORT_SOUND[id] ?? INSTRUMENT_BY_ID[id]?.label ?? id}</button>)}
            </div>
            <span style={{ fontSize: 11.5, color: TEXT2, padding: '0 2px' }}>Les pupitres sont joués par cet instrument.</span>
          </>}
        </>}
        {tab === 'voix' && <>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {VOICES.map(v => {
              const m = !!muted[v], s = solo.has(v), mine = myVoice === v
              const b = (on: boolean, bg: string): CSSProperties => ({ flex: 'none', width: 32, height: 32, border: 'none', borderRadius: 9, padding: 0, fontSize: 13, fontWeight: 800, background: on ? bg : '#F2F2F7', color: on ? '#FFFFFF' : INK })
              return (
                <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, minHeight: 36, borderTop: '1px solid #EFEFF4', opacity: audible(v) ? 1 : 0.6 }}>
                  <span style={{ flex: 'none', width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#FFFFFF', background: VCOLOR[v] }}>{v}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600 }}>{NAME[v]}</span>
                  <button type="button" aria-pressed={m} aria-label={`Couper ${NAME[v].toLowerCase()}`} onClick={() => toggleMute(v)} style={b(m, '#B3261E')}>M</button>
                  <button type="button" aria-pressed={s} aria-label={`Solo ${NAME[v].toLowerCase()}`} onClick={() => toggleSolo(v)} style={b(s, '#8A4C08')}>S</button>
                  <button type="button" aria-pressed={mine} aria-label={`C’est ma voix : ${NAME[v].toLowerCase()}`} onClick={() => set('myVoice', v)} style={b(mine, VCOLOR[v])}>★</button>
                </div>
              )
            })}
          </div>
          <div role="radiogroup" aria-label="Écoute" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 2, padding: 2, borderRadius: 10, background: '#F2F2F7' }}>
            {MODES.map(([id, l]) => <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => set('mode', id)} style={seg(mode === id)}>{l}</button>)}
          </div>
          <span style={{ fontSize: 11.5, color: TEXT2, padding: '0 2px' }}>{HINT[mode] ?? ''}</span>
        </>}
        {tab === 'vue' && <>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {([['Piano', pianoL, () => set('pianoL', !pianoL)], ['Paroles', lyrics, () => set('lyrics', !lyrics)], ['Ma voix en grand', big, () => set('big', !big)]] as const).map(([l, on, flip]) => (
              <button key={l} type="button" role="switch" aria-checked={on} onClick={flip} style={rowSw(on)}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600 }}>{l}</span><IosSwitch on={on} flip={flip} label={l} />
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 }}>
            <span style={caption}>Départ rapide</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4 }}>
              {PRESETS.map(([l, go]) => <button key={l} type="button" onClick={go} style={{ height: 40, border: 'none', borderRadius: 10, padding: '0 2px', fontSize: 12, fontWeight: 600, color: INK, background: '#F2F2F7' }}>{l}</button>)}
            </div>
            <span style={{ fontSize: 11.5, color: TEXT2 }}>Un point de départ : tout reste réglable ensuite.</span>
          </div>
        </>}
      </div>
    </aside>
  )
}

/** Bottom bar: prev · play · next · one tick per measure (or per phrase on long pieces). */
function TransportBar() {
  const { score, isPlaying, play, pause, currentBeat, seekTo, instrumentLoading } = usePlayer()
  if (!score) return null
  const bpm = score.beatsPerMeasure
  const total = score.measures.length
  const cur = Math.min(total, Math.floor(currentBeat / bpm) + 1)
  const perPhrase = total > 24
  const items = perPhrase
    ? score.renderBlocks.map((b, i) => ({ n: i + 1, start: b.measures[0].startBeat, end: b.measures[b.measures.length - 1].startBeat + bpm, label: `Phrase ${i + 1}` }))
    : score.measures.map((m, i) => ({ n: i + 1, start: m.startBeat, end: m.startBeat + bpm, label: `Mesure ${i + 1}` }))
  const starts = score.renderBlocks.map(b => b.measures[0].startBeat)
  const prev = () => seekTo([...starts].reverse().find(s => s < currentBeat - 1) ?? 0)
  const next = () => { const s = starts.find(x => x > currentBeat); if (s != null) seekTo(s) }
  const bare: CSSProperties = { flex: 'none', width: 40, height: 40, border: 'none', background: 'transparent', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  return (
    <div style={{ flex: 'none', height: 52, boxSizing: 'border-box', padding: '4px 10px 6px' }}>
      <div style={{ height: 42, borderRadius: 14, background: INK, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 2, padding: '0 12px 0 4px' }}>
        <button type="button" aria-label="Phrase précédente" onClick={prev} style={bare}><PrevIcon size={18} /></button>
        <button type="button" aria-label={isPlaying ? 'Pause' : 'Lecture'} disabled={instrumentLoading} onClick={isPlaying ? pause : play}
          style={{ flex: 'none', width: 38, height: 38, borderRadius: 19, border: 'none', background: '#FFFFFF', color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: instrumentLoading ? 0.4 : 1 }}>
          {isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
        </button>
        <button type="button" aria-label="Phrase suivante" onClick={next} style={bare}><NextIcon size={18} /></button>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', padding: '0 10px 0 6px' }}>
          {items.map(t => {
            const now = currentBeat >= t.start && currentBeat < t.end, past = currentBeat >= t.end
            return (
              <button key={t.n} type="button" aria-label={t.label} aria-pressed={now} onClick={() => seekTo(t.start)} style={{
                flex: 1, minWidth: 0, height: 30, padding: 0, border: 'none', borderRadius: 6, fontSize: 11, fontWeight: now ? 800 : 600,
                marginLeft: !perPhrase && (t.n - 1) % 4 === 0 && t.n > 1 ? 8 : 2,
                ...(now ? { background: '#FFFFFF', color: INK } : past ? { background: '#48484A', color: '#E5E5EA' } : { background: '#2C2C2E', color: '#8E8E93' }),
              }}>{t.n}</button>
            )
          })}
        </div>
        <span style={{ flex: 'none', fontSize: 12, fontWeight: 600, color: '#C7C7CC', whiteSpace: 'nowrap' }}>{perPhrase ? `Phrase ${Math.min(items.length, items.findIndex(t => currentBeat < t.end) + 1 || items.length)} / ${items.length}` : `Mes. ${cur} / ${total}`}</span>
      </div>
    </div>
  )
}

/** Partition (landscape): Ma voix · Paroles · Voix en repère · A/A (PartitionLecture.dc.html). */
function DisplayBar() {
  const { myVoice, noMine, lyrics, big, fontSize, set } = usePrefs()
  const sw = (on: boolean, extra: CSSProperties = {}): CSSProperties => ({
    flex: 'none', height: 34, border: 'none', borderRadius: 10, padding: '0 12px', fontSize: 12.5, fontWeight: 600,
    background: on ? INK : '#FFFFFF', color: on ? '#FFFFFF' : INK, ...extra,
  })
  const ref = big && !noMine
  return (
    <div style={{ flex: 'none', height: 40, boxSizing: 'border-box', padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ flex: 'none', fontSize: 12, fontWeight: 600, color: TEXT2 }}>Ma voix</span>
      <div role="radiogroup" aria-label="Ma voix" style={{ flex: 'none', display: 'flex', gap: 4 }}>
        {VOICES.map(v => {
          const on = !noMine && myVoice === v
          return <button key={v} type="button" role="radio" aria-checked={on} aria-label={NAME[v]} onClick={() => { set('myVoice', v); set('noMine', false) }}
            style={{ width: 38, height: 34, border: 'none', borderRadius: 10, padding: 0, fontSize: 14, fontWeight: 800, background: on ? VCOLOR[v] : '#FFFFFF', color: on ? '#FFFFFF' : VCOLOR[v] }}>{v}</button>
        })}
        <button type="button" role="radio" aria-checked={noMine} aria-label="Aucune voix marquée" onClick={() => set('noMine', true)} style={sw(noMine, { padding: '0 10px' })}>Aucune</button>
      </div>
      <span style={{ flex: 1 }} />
      <button type="button" role="switch" aria-checked={lyrics} onClick={() => set('lyrics', !lyrics)} style={sw(lyrics)}>Paroles</button>
      <button type="button" role="switch" aria-checked={ref} disabled={noMine} onClick={() => set('big', !big)} style={sw(ref, { opacity: noMine ? 0.4 : 1 })}>Voix en repère</button>
      <span style={{ flex: 'none', display: 'inline-flex', borderRadius: 10, background: '#FFFFFF', overflow: 'hidden' }}>
        <button type="button" aria-label="Texte plus petit" disabled={fontSize === 0} onClick={() => set('fontSize', Math.max(0, fontSize - 1) as 0 | 1 | 2)} style={{ width: 40, height: 34, border: 'none', background: 'transparent', fontSize: 12, fontWeight: 700, color: INK }}>A</button>
        <button type="button" aria-label="Texte plus grand" disabled={fontSize === 2} onClick={() => set('fontSize', Math.min(2, fontSize + 1) as 0 | 1 | 2)} style={{ width: 40, height: 34, border: 'none', background: 'transparent', fontSize: 17, fontWeight: 700, color: INK }}>A</button>
      </span>
    </div>
  )
}

/**
 * Phone landscape player: header (title · clé · tempo · Régler), score (+ optional
 * piano), right drawer, and the bottom bar with measure ticks.
 */
export function LandscapePlayer({ withPiano, onRecord }: { withPiano: boolean; onRecord?: () => void }) {
  const { score, error, playNote } = usePlayer()
  const { pianoL } = usePrefs()
  const { isEditing, enter, exit } = useEditor()
  const [dock, setDock] = useState(true)
  const m = score?.metadata
  const title = m?.title && m.title !== '-' ? m.title : 'Sans titre'
  if (!score) return <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: TEXT2, padding: 24, textAlign: 'center' }}>{error ?? 'Aucune partition ouverte — choisis-en une dans la bibliothèque.'}</div>
  return (
    <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <header style={{ flex: 'none', height: 50, boxSizing: 'border-box', padding: '0 12px 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
          <span style={{ fontSize: 11, color: TEXT2, whiteSpace: 'nowrap' }}>{m!.numerator}/{m!.denominator} · {withPiano ? `${score.renderBlocks.length} phrases` : `${score.measures.length} mesures`}</span>
        </div>
        <KeyPill /><TempoPill />
        {!withPiano && <button type="button" aria-label={isEditing ? 'Terminer l’édition' : 'Éditer'} onClick={isEditing ? exit : enter} style={{ flex: 'none', width: 40, height: 40, border: 'none', borderRadius: 12, display: 'grid', placeItems: 'center', background: isEditing ? INK : '#FFFFFF', color: isEditing ? '#fff' : INK }}><Icon name={isEditing ? 'check' : 'pencil'} size={18} /></button>}
        {withPiano && <button type="button" onClick={() => setDock(d => !d)} aria-pressed={dock} aria-label="Réglages rapides" style={{
          flex: 'none', width: 92, height: 40, border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: dock ? INK : '#FFFFFF', color: dock ? '#FFFFFF' : INK,
        }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg><span>Régler</span></button>}
      </header>
      {!withPiano && !isEditing && <DisplayBar />}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 8, padding: withPiano ? '0 10px' : 0 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {isEditing && !withPiano ? <><EditorGrid /><RhythmToolbar /></> : withPiano ? <PhraseList dense /> : <LectureList />}
          {withPiano && pianoL && (
            <section aria-label="Piano" style={{ flex: 'none', height: 66, boxSizing: 'border-box', padding: '5px 6px', borderRadius: 14, background: '#FFFFFF' }}>
              <MiniPiano whites={15} height={56} labeled onPress={playNote} />
            </section>
          )}
        </div>
        {withPiano && dock && <Dock onRecord={onRecord} />}
      </div>
      <TransportBar />
    </div>
  )
}

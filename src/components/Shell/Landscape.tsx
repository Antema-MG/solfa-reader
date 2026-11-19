import { useState, type CSSProperties } from 'react'
import type { Voice } from '../../types'
import { usePlayer } from '../../state/PlayerContext'
import { useEditor } from '../../state/EditorContext'
import { usePrefs, type FontSize, type ListenMode } from '../../state/PrefsContext'
import { TONICS } from '../../domain/pitch'
import { INSTRUMENT_BY_ID, variantFromTimbre, type InstrumentId } from '../../types/music'
import PhraseList from '../Score/PhraseList'
import Keyboard from '../Keyboard/Keyboard'
import EditorGrid from '../Editor/EditorGrid'
import RhythmToolbar from '../Editor/RhythmToolbar'
import { MODE_LABEL } from './ui'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']
const COLOR: Record<Voice, string> = { S: 'var(--s)', A: 'var(--a)', T: 'var(--t)', B: 'var(--b)' }
const NAME: Record<Voice, string> = { S: 'Soprano', A: 'Alto', T: 'Ténor', B: 'Basse' }
const INSTRUMENTS: InstrumentId[] = ['church_organ', 'acoustic_grand_piano', 'choir_aahs', 'string_ensemble_1', 'flute', 'trumpet']
const MODES: ListenMode[] = ['tutti', 'solo', 'without']

const sel: CSSProperties = {
  height: 40, minWidth: 0, width: '100%', borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg3)',
  color: 'var(--text)', fontSize: 14, padding: '0 8px',
}
const step: CSSProperties = { width: 40, height: 40, border: 'none', borderRadius: 10, background: 'var(--bg3)', fontSize: 20, color: 'var(--text)' }
const lab: CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--text2)', letterSpacing: '.06em' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}><span style={lab}>{label}</span>{children}</label>
}

function Switch({ on, flip, label }: { on: boolean; flip: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={flip} style={{
      position: 'relative', width: 50, height: 30, borderRadius: 15, border: 'none', padding: 0, background: on ? 'var(--green)' : 'var(--border2)', flex: 'none',
    }}><span style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 26, height: 26, borderRadius: 13, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .15s' }} /></button>
  )
}

/** Everything adjustable, in one popover: tempo, tonic, instrument, effect, zoom, text, lyrics, piano. */
function SettingsPopover({ onClose, withPiano }: { onClose: () => void; withPiano: boolean }) {
  const { tempo, tonic, instrumentId, setTempo, setTonic, setInstrument, solo, toggleSolo, score } = usePlayer()
  const { mode, zoom, fontSize, lyrics, pianoL, set } = usePrefs()
  const nudge = (d: number) => setTempo(Math.min(240, Math.max(30, tempo + d)))
  const zoomBy = (d: number) => set('zoom', Math.min(160, Math.max(60, zoom + d)))
  const inst = INSTRUMENTS.includes(instrumentId) ? INSTRUMENTS : [instrumentId, ...INSTRUMENTS]
  return (
    <div role="dialog" aria-label="Réglages" style={{
      position: 'absolute', right: 8, top: 52, width: 540, maxWidth: 'calc(100% - 16px)', maxHeight: 'calc(100dvh - 64px)', overflowY: 'auto', zIndex: 40,
      background: 'var(--bg2)', borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,.22), 0 0 0 1px var(--border)', padding: '10px 14px 14px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <b style={{ fontSize: 14 }}>Réglages</b>
        <button type="button" aria-label="Fermer" onClick={onClose} style={{ width: 36, height: 36, borderRadius: 18, border: 'none', background: 'var(--bg3)', color: 'var(--text)' }}>✕</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        <Field label="TEMPO">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button type="button" aria-label="Plus lent" onClick={() => nudge(-5)} style={step}>−</button>
            <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 14 }}>{tempo}</span>
            <button type="button" aria-label="Plus vite" onClick={() => nudge(5)} style={step}>+</button>
          </div>
        </Field>
        <Field label="TONIQUE (do =)">
          <select value={tonic} onChange={e => setTonic(e.target.value)} style={sel}>
            {TONICS.map(([k, l]) => <option key={k} value={k}>{l}{k === score?.metadata.key ? ' · original' : ''}</option>)}
          </select>
        </Field>
        <Field label="INSTRUMENT">
          <select value={instrumentId} onChange={e => setInstrument(e.target.value as InstrumentId)} style={sel}>
            {inst.map(id => <option key={id} value={id}>{INSTRUMENT_BY_ID[id]?.label ?? id}</option>)}
          </select>
        </Field>
        <Field label="ÉCOUTE">
          <select value={mode} onChange={e => set('mode', e.target.value as ListenMode)} style={sel}>
            {MODES.map(m => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
          </select>
        </Field>
        <Field label="ZOOM">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button type="button" aria-label="Dézoomer" onClick={() => zoomBy(-10)} style={step}>−</button>
            <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{zoom} %</span>
            <button type="button" aria-label="Zoomer" onClick={() => zoomBy(10)} style={step}>+</button>
          </div>
        </Field>
        <Field label="TEXTE">
          <div style={{ display: 'flex', padding: 2, borderRadius: 12, background: 'var(--bg3)', height: 40, boxSizing: 'border-box' }}>
            {([0, 1, 2] as FontSize[]).map(i => (
              <button key={i} type="button" aria-pressed={fontSize === i} aria-label={['Petit', 'Moyen', 'Grand'][i]} onClick={() => set('fontSize', i)} style={{
                flex: 1, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: [12, 15, 18][i],
                background: fontSize === i ? 'var(--ink)' : 'transparent', color: fontSize === i ? 'var(--on-ink)' : 'var(--text)',
              }}>A</button>
            ))}
          </div>
        </Field>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <span style={{ ...lab }}>SOLO</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {VOICES.map(v => (
            <button key={v} type="button" aria-pressed={solo.has(v)} aria-label={`Solo ${NAME[v]}`} onClick={() => toggleSolo(v)} style={{
              width: 40, height: 40, borderRadius: 10, border: '1px solid var(--border2)', fontSize: 13, fontWeight: 700,
              background: solo.has(v) ? 'var(--ink)' : 'var(--bg3)', color: solo.has(v) ? 'var(--on-ink)' : 'var(--text2)',
            }}>{v}</button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 13 }}>Paroles</span><Switch on={lyrics} flip={() => set('lyrics', !lyrics)} label="Afficher les paroles" />
        {withPiano && <><span style={{ fontSize: 13 }}>Piano</span><Switch on={pianoL} flip={() => set('pianoL', !pianoL)} label="Afficher le piano" /></>}
      </div>
    </div>
  )
}

/**
 * Phone landscape: the score owns the screen. One slim bar carries voices,
 * transport and a single "Réglages" button; the piano is optional.
 */
export function ScorePane({ withPiano }: { withPiano: boolean }) {
  const { score, error, isPlaying, play, pause, currentBeat, seekTo, muted, solo, toggleMute, timbre, litMidis, tonic, instrumentLoading } = usePlayer()
  const { myVoice, pianoL } = usePrefs()
  const { isEditing, enter, exit } = useEditor()
  const [open, setOpen] = useState(false)
  const m = score?.metadata
  const title = m?.title && m.title !== '-' ? m.title : 'Sans titre'
  const starts = score?.renderBlocks.map(b => b.measures[0].startBeat) ?? []
  const prev = () => seekTo([...starts].reverse().find(s => s < currentBeat - 1) ?? 0)
  const next = () => { const s = starts.find(x => x > currentBeat); if (s != null) seekTo(s) }
  const pct = score ? (currentBeat / score.totalBeats) * 100 : 0
  const icon: CSSProperties = { width: 40, height: 40, border: 'none', background: 'transparent', fontSize: 18, color: 'var(--text)', flex: 'none' }

  if (!score) return <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--text2)', padding: 24, textAlign: 'center' }}>{error ?? 'Aucune partition ouverte — choisis-en une dans la bibliothèque.'}</div>
  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <header style={{ flex: 'none', height: 48, padding: '0 8px 0 12px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)' }}>{m!.numerator}/{m!.denominator} · {tonic} · {m!.tempo} BPM</div>
        </div>
        <div role="group" aria-label="Voix" style={{ display: 'flex', gap: 4 }}>
          {VOICES.map(v => {
            const off = solo.size ? !solo.has(v) : muted[v]
            return (
              <button key={v} type="button" aria-pressed={!off} aria-label={NAME[v]} title={NAME[v]} onClick={() => toggleMute(v)} style={{
                width: 36, height: 36, borderRadius: 18, border: `1.5px solid ${COLOR[v]}`, fontSize: 13, fontWeight: 800,
                background: off ? 'transparent' : COLOR[v], color: off ? COLOR[v] : '#fff', opacity: off ? 0.45 : 1,
                boxShadow: v === myVoice ? '0 0 0 2px var(--bg2), 0 0 0 3.5px var(--a)' : undefined,
              }}>{v}</button>
            )
          })}
        </div>
        <span aria-hidden style={{ width: 1, height: 24, background: 'var(--border2)' }} />
        <button type="button" aria-label="Phrase précédente" onClick={prev} style={icon}>⏮</button>
        <button type="button" aria-label={isPlaying ? 'Pause' : 'Lecture'} disabled={instrumentLoading} onClick={isPlaying ? pause : play} style={{
          width: 40, height: 40, borderRadius: 20, border: 'none', background: 'var(--ink)', color: 'var(--on-ink)', fontSize: 16, flex: 'none', opacity: instrumentLoading ? 0.4 : 1,
        }}>{instrumentLoading ? '⋯' : isPlaying ? '⏸' : '▶'}</button>
        <button type="button" aria-label="Phrase suivante" onClick={next} style={icon}>⏭</button>
        {!withPiano && <button type="button" onClick={isEditing ? exit : enter} style={{ ...icon, width: 'auto', padding: '0 8px', fontSize: 12, fontWeight: 700, borderRadius: 20, background: isEditing ? 'var(--ink)' : 'var(--bg3)', color: isEditing ? 'var(--on-ink)' : 'var(--text)' }}>{isEditing ? '✓' : '✎'}</button>}
        <button type="button" aria-label="Réglages" aria-expanded={open} onClick={() => setOpen(o => !o)} style={{
          ...icon, borderRadius: 20, fontSize: 20, fontWeight: 800, background: open ? 'var(--ink)' : 'var(--bg3)', color: open ? 'var(--on-ink)' : 'var(--text)',
        }}>⚙</button>
      </header>
      <div onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * score.totalBeats) }}
        style={{ flex: 'none', height: 6, background: 'var(--bg4)', cursor: 'pointer', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${pct}%`, background: 'var(--accent)' }} />
      </div>

      {isEditing && !withPiano ? <><EditorGrid /><RhythmToolbar /></> : <PhraseList dense />}

      {withPiano && pianoL && (
        <div aria-label="Piano" style={{ flex: 'none', height: 68, overflowX: 'auto', overflowY: 'hidden', background: 'var(--bg3)', borderTop: '1px solid var(--border)' }}>
          <div style={{ zoom: 0.5 }}>
            <Keyboard variant={variantFromTimbre(timbre)} litMidis={litMidis} tonic={tonic} disabled={instrumentLoading} />
          </div>
        </div>
      )}
      {open && <SettingsPopover onClose={() => setOpen(false)} withPiano={withPiano} />}
    </div>
  )
}

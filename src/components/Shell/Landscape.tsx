import { useState, type CSSProperties } from 'react'
import { Icon } from './Icon'
import type { Voice } from '../../types'
import { usePlayer } from '../../state/PlayerContext'
import { useEditor } from '../../state/EditorContext'
import { usePrefs, type FontSize, type ListenMode } from '../../state/PrefsContext'
import { TONICS } from '../../domain/pitch'
import { variantFromTimbre } from '../../types/music'
import PhraseList from '../Score/PhraseList'
import Keyboard from '../Keyboard/Keyboard'
import EditorGrid from '../Editor/EditorGrid'
import RhythmToolbar from '../Editor/RhythmToolbar'
import { MODE_LABEL, SoundPicker, useSoundLabel } from './ui'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']
const COLOR: Record<Voice, string> = { S: 'var(--s)', A: 'var(--a)', T: 'var(--t)', B: 'var(--b)' }
const NAME: Record<Voice, string> = { S: 'Soprano', A: 'Alto', T: 'Ténor', B: 'Basse' }
const MODES: ListenMode[] = ['tutti', 'solo', 'without']

function Switch({ on, flip, label }: { on: boolean; flip: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={flip} style={{
      position: 'relative', width: 51, height: 31, borderRadius: 16, border: 'none', padding: 0, background: on ? '#34c759' : 'var(--fill)', flex: 'none', transition: 'background .2s',
    }}><span style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 27, height: 27, borderRadius: 14, background: '#fff', boxShadow: '0 3px 8px rgba(0,0,0,.15), 0 1px 1px rgba(0,0,0,.16)', transition: 'left .2s' }} /></button>
  )
}

function Stepper({ dec, inc, labels }: { dec: () => void; inc: () => void; labels: [string, string] }) {
  return (
    <span className="ios-stepper">
      <button type="button" aria-label={labels[0]} onClick={dec}>−</button><i /><button type="button" aria-label={labels[1]} onClick={inc}>+</button>
    </span>
  )
}

/** Everything adjustable, in one popover, laid out like iOS Settings. */
function SettingsPopover({ onClose, withPiano }: { onClose: () => void; withPiano: boolean }) {
  const { tempo, tonic, setTempo, setTonic, solo, toggleSolo, score } = usePlayer()
  const { mode, myVoice, zoom, fontSize, lyrics, pianoL, set } = usePrefs()
  const nudge = (d: number) => setTempo(Math.min(240, Math.max(30, tempo + d)))
  const zoomBy = (d: number) => set('zoom', Math.min(160, Math.max(60, zoom + d)))
  return (
    <div role="dialog" aria-label="Son et voix" style={{
      position: 'absolute', right: 8, top: 52, width: 860, maxWidth: 'calc(100% - 16px)', maxHeight: 'calc(100dvh - 64px)', overflowY: 'auto', zIndex: 40,
      background: 'var(--bg3)', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,.2), 0 0 0 0.5px var(--border2)', padding: '10px 14px 16px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 600, paddingLeft: 4 }}>Son et voix</span>
        <button type="button" aria-label="Fermer" onClick={onClose} style={{ width: 30, height: 30, borderRadius: 15, border: 'none', background: 'var(--fill)', color: 'var(--text2)', display: 'grid', placeItems: 'center' }}><Icon name="close" size={14} /></button>
      </div>

      {/* Two columns side by side: landscape has width, not height. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
        <SoundPicker />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div className="ios-caption">Ma partie</div>
            <div className="ios-group">
              <div className="ios-row stack">
                <span>Je chante</span>
                <div role="radiogroup" aria-label="Je chante" className="ios-seg">
                  {VOICES.map(v => <button key={v} type="button" role="radio" aria-checked={myVoice === v} onClick={() => set('myVoice', v)} style={{ color: myVoice === v ? COLOR[v] : undefined }}>{NAME[v]}</button>)}
                </div>
              </div>
              <div className="ios-row stack">
                <span>Écoute</span>
                <div role="radiogroup" aria-label="Écoute" className="ios-seg">
                  {MODES.map(m => <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => set('mode', m)}>{MODE_LABEL[m]}</button>)}
                </div>
              </div>
              <div className="ios-row stack">
                <span>Solo</span>
                <div className="ios-seg">
                  {VOICES.map(v => <button key={v} type="button" aria-pressed={solo.has(v)} aria-label={`Solo ${NAME[v]}`} onClick={() => toggleSolo(v)}>{NAME[v]}</button>)}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="ios-caption">Lecture</div>
            <div className="ios-group">
              <div className="ios-row"><span style={{ flex: 1 }}>Tempo</span><span className="value">{tempo}</span>
                <Stepper dec={() => nudge(-5)} inc={() => nudge(5)} labels={['Plus lent', 'Plus vite']} /></div>
              <label className="ios-row"><span style={{ flex: 'none' }}>Tonique (do =)</span>
                <select value={tonic} onChange={e => setTonic(e.target.value)} style={{ flex: 1 }}>
                  {TONICS.map(([k, l]) => <option key={k} value={k}>{l}{k === score?.metadata.key ? ' · original' : ''}</option>)}
                </select></label>
              <div className="ios-row"><span style={{ flex: 1 }}>Zoom</span><span className="value">{zoom} %</span>
                <Stepper dec={() => zoomBy(-10)} inc={() => zoomBy(10)} labels={['Dézoomer', 'Zoomer']} /></div>
              <div className="ios-row"><span style={{ flex: 1 }}>Texte</span>
                <div className="ios-seg" style={{ width: 132 }}>
                  {([0, 1, 2] as FontSize[]).map(i => (
                    <button key={i} type="button" aria-pressed={fontSize === i} aria-label={['Petit', 'Moyen', 'Grand'][i]} onClick={() => set('fontSize', i)} style={{ fontSize: [11, 14, 17][i] }}>A</button>
                  ))}
                </div></div>
              <div className="ios-row"><span style={{ flex: 1 }}>Paroles</span><Switch on={lyrics} flip={() => set('lyrics', !lyrics)} label="Afficher les paroles" /></div>
              {withPiano && <div className="ios-row"><span style={{ flex: 1 }}>Piano</span><Switch on={pianoL} flip={() => set('pianoL', !pianoL)} label="Afficher le piano" /></div>}
            </div>
          </div>
        </div>
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
  const soundLabel = useSoundLabel()
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
        <button type="button" className="tp" aria-label="Phrase précédente" onClick={prev} style={{ width: 36, height: 36 }}><Icon name="rewind" size={20} /></button>
        <button type="button" className="tp" aria-label={isPlaying ? 'Pause' : 'Lecture'} disabled={instrumentLoading} onClick={isPlaying ? pause : play}
          style={{ width: 40, height: 40, opacity: instrumentLoading ? 0.35 : 1 }}><Icon name={instrumentLoading ? 'more' : isPlaying ? 'pause' : 'play'} size={26} /></button>
        <button type="button" className="tp" aria-label="Phrase suivante" onClick={next} style={{ width: 36, height: 36 }}><Icon name="fastForward" size={20} /></button>
        {!withPiano && <button type="button" aria-label={isEditing ? 'Terminer l’édition' : 'Éditer'} onClick={isEditing ? exit : enter} style={{ ...icon, width: 36, height: 36, borderRadius: 18, display: 'grid', placeItems: 'center', background: isEditing ? 'var(--bg4)' : 'var(--fill)', color: 'var(--text)' }}><Icon name={isEditing ? 'check' : 'pencil'} size={18} /></button>}
        <button type="button" aria-label={`Son et voix : ${soundLabel}`} aria-expanded={open} onClick={() => setOpen(o => !o)} style={{
          ...icon, width: 'auto', maxWidth: 200, height: 34, padding: '0 10px 0 12px', borderRadius: 17, display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, fontWeight: 500, background: open ? 'var(--bg4)' : 'var(--fill)', color: 'var(--text)',
        }}>
          <Icon name="sliders" size={16} />
          <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{soundLabel}</span>
          <Icon name="chevronDown" size={12} style={{ color: 'var(--text2)', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
        </button>
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

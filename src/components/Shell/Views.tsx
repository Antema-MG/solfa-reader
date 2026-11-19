import { useEffect, type CSSProperties } from 'react'
import { Icon } from './Icon'
import type { Voice } from '../../types'
import { usePlayer } from '../../state/PlayerContext'
import { useEditor } from '../../state/EditorContext'
import { usePrefs, type ListenMode, type MySound } from '../../state/PrefsContext'
import { variantFromTimbre, type InstrumentId } from '../../types/music'
import PhraseList from '../Score/PhraseList'
import Keyboard from '../Keyboard/Keyboard'
import EditorGrid from '../Editor/EditorGrid'
import RhythmToolbar from '../Editor/RhythmToolbar'
import { Combo, DisplayMenu, usePiano, MODE_LABEL, SettingsChips, SoundCombo, SoundPicker, Transport, VoiceBar, pill, useDesktop, useWide } from './ui'
import type { SungStyle } from '../../domain/choir'
import { loadTakes } from '../../services/recordedChoir'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']
const COLOR: Record<Voice, string> = { S: 'var(--s)', A: 'var(--a)', T: 'var(--t)', B: 'var(--b)' }
const NAME: Record<Voice, string> = { S: 'Soprano', A: 'Alto', T: 'Ténor', B: 'Basse' }

/** Translates "Effet de voix" + "je chante" into the player's mute/solo state. */
export function useListenMode() {
  const { mode, myVoice } = usePrefs()
  const { muted, solo, toggleMute, toggleSolo, score } = usePlayer()
  useEffect(() => {
    const wantSolo = new Set<Voice>(mode === 'solo' ? [myVoice] : [])
    const wantMuted = new Set<Voice>(mode === 'without' ? [myVoice] : [])
    VOICES.forEach(v => {
      if (solo.has(v) !== wantSolo.has(v)) toggleSolo(v)
      if (!!muted[v] !== wantMuted.has(v)) toggleMute(v)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, myVoice, score])
}

/** Gives "ma voix" its own instrument (piano, choir...), the others keep the main one. */
export function useMySound() {
  const { mySound, myVoice, singers, reverb } = usePrefs()
  const { setVoiceInstrument, setChoirFx } = usePlayer()
  useEffect(() => {
    VOICES.forEach(v => setVoiceInstrument(v, v === myVoice && mySound !== 'same' ? (mySound as InstrumentId | SungStyle) : null))
  }, [mySound, myVoice, setVoiceInstrument])
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
    }} style={{ height: 14, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--bg4)', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${pct}%`, borderRadius: 2, background: 'var(--ink)' }} />
      </div>
    </div>
  )
}

/** Écoute: all phrases + quiet settings + optional compact piano + transport. */
export function ListenView({ goLibrary, back }: { goLibrary?: () => void; back?: Back }) {
  const { score, error, title, sub } = useMeta()
  const { timbre, litMidis, tonic, instrumentLoading } = usePlayer()
  const [piano] = usePiano()
  const wide = useWide()
  if (!score) return <><Header title="Écoute" back={back} /><NoScore go={goLibrary} />{error && <p style={{ color: 'var(--red-btn)', padding: 16 }}>{error}</p>}</>
  return (
    <>
      <Header title={title} sub={sub} back={back} right={<DisplayMenu withPiano />} />
      <div style={{ flex: 'none', padding: '0 16px 8px' }}><VoiceBar /></div>
      <PhraseList />
      <section style={{ flex: 'none', padding: '10px 16px 12px', background: 'var(--bg2)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SettingsChips />
        {piano && (
          <div aria-label="Piano" style={{ overflowX: 'auto', borderRadius: 12, background: 'var(--bg3)', height: wide ? 124 : 86 }}>
            {/* Compact: bare keybed, scaled down (CSS zoom keeps the scroll width in step). */}
            <div style={{ zoom: wide ? 0.9 : 0.62 }}>
              <Keyboard variant={variantFromTimbre(timbre)} litMidis={litMidis} tonic={tonic} disabled={instrumentLoading} />
            </div>
          </div>
        )}
        <Progress />
        <Transport withPiano />
      </section>
    </>
  )
}

/** Partition: reading view, with edit mode (existing grid editor). */
export function ScoreScreen({ goLibrary, back }: { goLibrary?: () => void; back?: Back }) {
  const { score, error, title, sub } = useMeta()
  const { isEditing, enter, exit } = useEditor()
  if (!score) return <><Header title="Partition" back={back} /><NoScore go={goLibrary} />{error && <p style={{ color: 'var(--red-btn)', padding: 16 }}>{error}</p>}</>
  return (
    <>
      <Header title={title} sub={sub} back={back} right={<>
        <button type="button" onClick={isEditing ? exit : enter} style={{ ...pill(isEditing, 36), marginRight: 2, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name={isEditing ? 'check' : 'pencil'} size={16} />{isEditing ? 'Terminer' : 'Éditer'}</button>
        <DisplayMenu />
      </>} />
      {isEditing ? (
        <><EditorGrid /><RhythmToolbar /></>
      ) : (
        <>
          <div style={{ flex: 'none', padding: '0 16px 8px' }}><VoiceBar /></div>
          <PhraseList />
          <div style={{ flex: 'none', padding: '8px 16px 10px', background: 'var(--bg2)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Progress /><Transport />
          </div>
        </>
      )}
    </>
  )
}

const MODES: ListenMode[] = ['tutti', 'solo', 'without']

/**
 * Chorale panel, organised by task (proposal A):
 *  - Ma partie: which voice I sing, how I listen, the sound of my voice
 *  - Le chœur: the choir's sound, its effects, recording real voices
 * Tempo / tonique / per-voice mute live in the centre on desktop (no duplicates).
 */
export function ChoirPanel() {
  const { myVoice, mode, mySound, set } = usePrefs()
  const { muted, solo, toggleMute } = usePlayer()
  const desktop = useDesktop()
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
          <div className="ios-row stack">
            <span>Écoute</span>
            <div role="radiogroup" aria-label="Écoute" className="ios-seg">
              {MODES.map(m => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => set('mode', m)}>
                  {m === 'without' ? 'Sans moi' : m === 'solo' ? 'Ma voix' : MODE_LABEL[m]}
                </button>
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

      <section aria-label="Le chœur">
        <div className="ios-caption">Le chœur</div>
        {desktop
          ? <div className="ios-group"><SoundCombo row /><SoundPicker /></div>
          : <SoundPicker />}
      </section>

      {!desktop && (
        <section aria-label="Pupitres">
          <div className="ios-caption">Pupitres actifs</div>
          <div className="ios-seg">
            {VOICES.map(v => {
              const on = solo.size ? solo.has(v) : !muted[v]
              return <button key={v} type="button" aria-pressed={on} onClick={() => toggleMute(v)} style={{ color: on ? COLOR[v] : 'var(--text3)' }}>{NAME[v]}</button>
            })}
          </div>
        </section>
      )}

      {!desktop && <SettingsChips />}
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
      <div style={{ flex: 'none', padding: '8px 16px 10px', background: 'var(--bg2)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Progress /><Transport />
      </div>
    </>
  )
}

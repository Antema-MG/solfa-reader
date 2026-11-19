import { useEffect, type CSSProperties } from 'react'
import type { Voice } from '../../types'
import { usePlayer } from '../../state/PlayerContext'
import { useEditor } from '../../state/EditorContext'
import { usePrefs, type ListenMode, type MySound } from '../../state/PrefsContext'
import { variantFromTimbre, type InstrumentId } from '../../types/music'
import PhraseList from '../Score/PhraseList'
import Keyboard from '../Keyboard/Keyboard'
import EditorGrid from '../Editor/EditorGrid'
import RhythmToolbar from '../Editor/RhythmToolbar'
import { DisplayMenu, MODE_LABEL, SettingsChips, Transport, VoiceBar, pill, useWide } from './ui'

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
  const { mySound, myVoice } = usePrefs()
  const { setVoiceInstrument } = usePlayer()
  useEffect(() => {
    VOICES.forEach(v => setVoiceInstrument(v, v === myVoice && mySound !== 'same' ? (mySound as InstrumentId) : null))
  }, [mySound, myVoice, setVoiceInstrument])
}

export const SOUNDS: { value: MySound; label: string }[] = [
  { value: 'same', label: 'Comme les autres voix' },
  { value: 'acoustic_grand_piano', label: 'Piano' },
  { value: 'synth_choir', label: 'Voix synthétisée' },
  { value: 'choir_aahs', label: 'Chœur « Ahhh »' },
  { value: 'voice_oohs', label: 'Chœur « Ohhh »' },
]

function Header({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <header style={{ flex: 'none', padding: '14px 12px 8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
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
export function ListenView({ goLibrary }: { goLibrary?: () => void }) {
  const { score, error, title, sub } = useMeta()
  const { timbre, litMidis, tonic, instrumentLoading } = usePlayer()
  const { piano } = usePrefs()
  const wide = useWide()
  if (!score) return <><Header title="Écoute" /><NoScore go={goLibrary} />{error && <p style={{ color: 'var(--red-btn)', padding: 16 }}>{error}</p>}</>
  return (
    <>
      <Header title={title} sub={sub} right={<DisplayMenu withPiano />} />
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
export function ScoreScreen({ goLibrary }: { goLibrary?: () => void }) {
  const { score, error, title, sub } = useMeta()
  const { isEditing, enter, exit } = useEditor()
  if (!score) return <><Header title="Partition" /><NoScore go={goLibrary} />{error && <p style={{ color: 'var(--red-btn)', padding: 16 }}>{error}</p>}</>
  return (
    <>
      <Header title={title} sub={sub} right={<>
        <button type="button" onClick={isEditing ? exit : enter} style={{ ...pill(isEditing, 36), marginRight: 2 }}>{isEditing ? '✓ Édition' : '✎ Éditer'}</button>
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

/** Chorale: pick "je chante", how to listen, per-voice presence. */
/** The choir controls on their own: the Chorale tab on phones, the right column on desktop. */
export function ChoirPanel() {
  const { myVoice, mode, mySound, set } = usePrefs()
  const { muted, solo, toggleMute } = usePlayer()
  const card: CSSProperties = { background: 'var(--bg2)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }
  const label: CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--text2)', letterSpacing: '.06em' }
  return (
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ ...label, padding: '0 4px' }}>JE CHANTE</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
            {VOICES.map(v => (
              <button key={v} type="button" aria-pressed={myVoice === v} onClick={() => set('myVoice', v)} style={{
                height: 64, borderRadius: 14, border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                background: myVoice === v ? COLOR[v] : 'var(--bg2)', color: myVoice === v ? '#fff' : 'var(--text2)',
              }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: myVoice === v ? '#fff' : COLOR[v] }}>{v}</span>
                <span style={{ fontSize: 11 }}>{NAME[v]}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ ...label, padding: '0 4px' }}>ÉCOUTE</span>
          <div style={{ ...card, padding: '2px 14px' }}>
            {MODES.map((m, i) => (
              <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 48, borderTop: i ? '1px solid var(--border)' : undefined }}>
                <input type="radio" name="mode" checked={mode === m} onChange={() => set('mode', m)} style={{ width: 20, height: 20, accentColor: 'var(--ink)' }} />
                <span style={{ fontSize: 15, fontWeight: 600 }}>{MODE_LABEL[m]}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ ...label, padding: '0 4px' }}>SON DE MA VOIX</span>
          <div style={{ ...card, padding: '2px 14px' }}>
            {SOUNDS.map((o, i) => (
              <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 48, borderTop: i ? '1px solid var(--border)' : undefined }}>
                <input type="radio" name="sound" checked={mySound === o.value} onChange={() => set('mySound', o.value)} style={{ width: 20, height: 20, accentColor: 'var(--ink)' }} />
                <span style={{ fontSize: 15, fontWeight: 600 }}>{o.label}</span>
              </label>
            ))}
            {['Solfège chanté (do, ré, mi…)', 'Voix de synthèse (paroles)'].map(l => (
              <label key={l} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 48, borderTop: '1px solid var(--border)', opacity: 0.45 }}>
                <input type="radio" disabled style={{ width: 20, height: 20 }} />
                <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{l}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-ink)' }}>BIENTÔT</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ ...label, padding: '0 4px' }}>PUPITRES</span>
          <div style={{ ...card, gap: 4 }}>
            {VOICES.map(v => {
              const on = solo.size ? solo.has(v) : !muted[v]
              return (
                <button key={v} type="button" aria-pressed={on} onClick={() => toggleMute(v)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, height: 44, border: 'none', background: 'transparent', color: 'var(--text)', textAlign: 'left',
                }}>
                  <span style={{ width: 18, fontWeight: 800, color: COLOR[v] }}>{v}</span>
                  <span style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg4)', position: 'relative' }}>
                    <span style={{ position: 'absolute', inset: '0 auto 0 0', width: on ? '100%' : '0%', borderRadius: 3, background: COLOR[v], transition: 'width .15s' }} />
                  </span>
                  <span style={{ width: 56, textAlign: 'right', fontSize: 12, color: 'var(--text2)' }}>{on ? 'joue' : 'muet'}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ ...label, padding: '0 4px' }}>RÉGLAGES</span>
          <SettingsChips />
        </div>
      </div>
  )
}

export function ChoirView({ goLibrary }: { goLibrary?: () => void }) {
  const { score, title } = useMeta()
  const { myVoice } = usePrefs()
  if (!score) return <><Header title="Chorale" /><NoScore go={goLibrary} /></>
  return (
    <>
      <Header title="Répétition" sub={`${title} · ${NAME[myVoice]}`} />
      <ChoirPanel />
      <div style={{ flex: 'none', padding: '8px 16px 10px', background: 'var(--bg2)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Progress /><Transport />
      </div>
    </>
  )
}

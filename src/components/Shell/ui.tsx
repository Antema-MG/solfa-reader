import { useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import type { Voice } from '../../types'
import { usePlayer } from '../../state/PlayerContext'
import { usePrefs, type ListenMode, type FontSize } from '../../state/PrefsContext'
import { TONICS } from '../../domain/pitch'
import { INSTRUMENT_BY_ID, type InstrumentId } from '../../types/music'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']
const COLOR: Record<Voice, string> = { S: 'var(--s)', A: 'var(--a)', T: 'var(--t)', B: 'var(--b)' }

export const pill = (on: boolean, h = 32): CSSProperties => ({
  height: h, padding: '0 12px', borderRadius: h / 2, border: on ? 'none' : '1px solid var(--border2)',
  background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--on-ink)' : 'var(--text2)',
  fontSize: 13, fontWeight: 700, flex: 'none',
})

const VOICE_LABEL: Record<Voice, string> = { S: 'Soprano', A: 'Alto', T: 'Ténor', B: 'Basse' }

/** The original voice bar: tap a voice to mute it (struck through), Solo to isolate one. */
export function VoiceBar() {
  const { muted, solo, toggleMute, toggleSolo } = usePlayer()
  const { myVoice } = usePrefs()
  return (
    <div role="group" aria-label="Voix" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {VOICES.map(v => {
        const off = solo.size ? !solo.has(v) : muted[v]
        return (
          <button key={v} type="button" aria-pressed={!off} onClick={() => toggleMute(v)} style={{
            display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 11px', borderRadius: 17,
            border: `1px solid ${COLOR[v]}`, color: COLOR[v], background: 'transparent', fontSize: 12, fontWeight: 600,
            opacity: off ? 0.38 : 1, textDecoration: off ? 'line-through' : 'none',
            boxShadow: v === myVoice ? '0 0 0 2px var(--bg), 0 0 0 3.5px var(--a)' : undefined,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR[v] }} />
            {VOICE_LABEL[v]}
          </button>
        )
      })}
      <span style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.08em', marginLeft: 4 }}>Solo</span>
      {VOICES.map(v => (
        <button key={v} type="button" aria-pressed={solo.has(v)} aria-label={`Solo ${VOICE_LABEL[v]}`} onClick={() => toggleSolo(v)} style={{
          width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border2)', fontSize: 11, fontWeight: 700,
          background: solo.has(v) ? 'var(--ink)' : 'var(--bg3)', color: solo.has(v) ? 'var(--on-ink)' : 'var(--text2)',
        }}>{v}</button>
      ))}
    </div>
  )
}

/** Bottom sheet (mobile) / centered card (wide). Closes on backdrop tap or Escape. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <button type="button" aria-label="Fermer" onClick={onClose} style={{ flex: 1, border: 'none', background: 'rgba(0,0,0,.3)' }} />
      <div role="dialog" aria-label={title} style={{
        background: 'var(--bg2)', borderRadius: '14px 14px 0 0', padding: '8px 16px 28px',
        width: '100%', maxWidth: 520, margin: '0 auto',
      }}>
        <span aria-hidden style={{ display: 'block', width: 36, height: 5, borderRadius: 3, background: 'var(--border2)', margin: '0 auto 8px' }} />
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', letterSpacing: '.06em', padding: '4px 4px 6px' }}>{title.toUpperCase()}</div>
        {children}
      </div>
    </div>
  )
}

function Options<T extends string | number>({ options, value, onPick }: {
  options: { value: T; label: string; disabled?: boolean }[]; value: T; onPick: (v: T) => void
}) {
  return (
    <>
      {options.map(o => (
        <button key={String(o.value)} type="button" disabled={o.disabled} onClick={() => onPick(o.value)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', height: 48, padding: '0 4px',
          border: 'none', borderTop: '1px solid var(--border)', background: 'transparent',
          color: o.disabled ? 'var(--text3)' : 'var(--text)', fontSize: 16, textAlign: 'left',
        }}>
          <span>{o.label}</span>
          {o.value === value && <span style={{ color: 'var(--accent-ink)', fontWeight: 800 }}>✓</span>}
        </button>
      ))}
    </>
  )
}

export const MODE_LABEL: Record<ListenMode, string> = {
  tutti: 'Tutti', solo: 'Ma voix seule', without: 'Sans ma voix', front: 'Ma voix en avant',
}
const MODE_OPTIONS = (['tutti', 'solo', 'without', 'front'] as ListenMode[]).map(m => ({
  value: m, label: MODE_LABEL[m] + (m === 'front' ? ' (bientôt)' : ''), disabled: m === 'front',
}))
const INSTRUMENTS: InstrumentId[] = ['church_organ', 'acoustic_grand_piano', 'choir_aahs', 'string_ensemble_1', 'flute', 'trumpet']

type Picker = 'tempo' | 'tonic' | 'inst' | 'fx' | null

/** One quiet row of 4 chips (Tempo · Tonique · Instrument · Effet). Each opens a sheet. */
export function SettingsChips({ style }: { style?: CSSProperties }) {
  const { tempo, tonic, instrumentId, setTempo, setTonic, setInstrument, score } = usePlayer()
  const { mode, set } = usePrefs()
  const [open, setOpen] = useState<Picker>(null)
  const orig = score?.metadata.tempo
  const tempos = [...new Set([60, 70, 80, 90, 100, ...(orig ? [orig] : [])])].sort((a, b) => a - b)
  const tonicLabel = TONICS.find(([k]) => k === tonic)?.[1] ?? tonic
  const chip: CSSProperties = {
    flex: 1, minWidth: 0, height: 34, border: 'none', borderRadius: 17, background: 'var(--bg3)',
    color: 'var(--text)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 8px',
  }
  const close = () => setOpen(null)
  return (
    <>
      <div style={{ display: 'flex', gap: 6, ...style }}>
        <button type="button" style={chip} onClick={() => setOpen('tempo')}>{tempo} BPM</button>
        <button type="button" style={chip} onClick={() => setOpen('tonic')}>do = {tonicLabel}</button>
        <button type="button" style={chip} onClick={() => setOpen('inst')}>{INSTRUMENT_BY_ID[instrumentId]?.label ?? instrumentId}</button>
        <button type="button" style={chip} onClick={() => setOpen('fx')}>{MODE_LABEL[mode]}</button>
      </div>
      {open === 'tempo' && <Sheet title="Tempo" onClose={close}>
        <Options value={tempo} onPick={v => { setTempo(v); close() }}
          options={tempos.map(t => ({ value: t, label: `${t} BPM${t === orig ? ' · original' : ''}` }))} /></Sheet>}
      {open === 'tonic' && <Sheet title="Tonique (do =)" onClose={close}>
        <Options value={tonic} onPick={v => { setTonic(v); close() }}
          options={TONICS.map(([k, l]) => ({ value: k, label: l + (k === score?.metadata.key ? ' · original' : '') }))} /></Sheet>}
      {open === 'inst' && <Sheet title="Instrument" onClose={close}>
        <Options value={instrumentId} onPick={v => { setInstrument(v); close() }}
          options={INSTRUMENTS.map(id => ({ value: id, label: INSTRUMENT_BY_ID[id].label }))} /></Sheet>}
      {open === 'fx' && <Sheet title="Effet de voix" onClose={close}>
        <Options value={mode} onPick={v => { set('mode', v); close() }} options={MODE_OPTIONS} /></Sheet>}
    </>
  )
}

/** "⋯ Affichage" popover: zoom, text size, lyrics, optional piano switch. */
export function DisplayMenu({ withPiano = false }: { withPiano?: boolean }) {
  const { zoom, fontSize, lyrics, piano, set } = usePrefs()
  const [open, setOpen] = useState(false)
  const row: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
  const step = (d: number) => set('zoom', Math.min(160, Math.max(60, zoom + d)))
  const sw = (on: boolean, flip: () => void, label: string) => (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={flip} style={{
      position: 'relative', width: 50, height: 30, borderRadius: 15, border: 'none', padding: 0, background: on ? 'var(--green)' : 'var(--border2)',
    }}><span style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 26, height: 26, borderRadius: 13, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .15s' }} /></button>
  )
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" aria-label="Affichage" aria-expanded={open} onClick={() => setOpen(o => !o)} style={{
        width: 44, height: 44, borderRadius: 22, border: 'none', fontSize: 20, fontWeight: 800, lineHeight: 1,
        background: open ? 'var(--ink)' : 'transparent', color: open ? 'var(--on-ink)' : 'var(--text)',
      }}>⋯</button>
      {open && (
        <div role="dialog" aria-label="Affichage" style={{
          position: 'absolute', right: 0, top: 48, width: 252, zIndex: 40, background: 'var(--bg2)', borderRadius: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,.18), 0 0 0 1px var(--border)', padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={row}><b style={{ fontSize: 13 }}>Affichage</b>
            <button type="button" aria-label="Fermer" onClick={() => setOpen(false)} style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: 'var(--bg3)', color: 'var(--text)' }}>✕</button></div>
          <div style={row}><span style={{ fontSize: 13 }}>Zoom</span>
            <div style={{ display: 'flex', alignItems: 'center', height: 36, borderRadius: 18, background: 'var(--bg3)' }}>
              <button type="button" aria-label="Dézoomer" onClick={() => step(-10)} style={{ width: 36, height: 36, border: 'none', background: 'transparent', fontSize: 18, color: 'var(--text)' }}>−</button>
              <span style={{ minWidth: 44, textAlign: 'center', fontSize: 12, fontWeight: 700 }}>{zoom} %</span>
              <button type="button" aria-label="Zoomer" onClick={() => step(10)} style={{ width: 36, height: 36, border: 'none', background: 'transparent', fontSize: 18, color: 'var(--text)' }}>+</button>
            </div></div>
          <div style={row}><span style={{ fontSize: 13 }}>Taille du texte</span>
            <div style={{ display: 'flex', padding: 2, borderRadius: 18, background: 'var(--bg3)' }}>
              {([0, 1, 2] as FontSize[]).map(i => (
                <button key={i} type="button" aria-pressed={fontSize === i} aria-label={['Petit', 'Moyen', 'Grand'][i]} onClick={() => set('fontSize', i)} style={{
                  width: 34, height: 32, borderRadius: 16, border: 'none', fontWeight: 700, fontSize: [12, 15, 18][i],
                  background: fontSize === i ? 'var(--ink)' : 'transparent', color: fontSize === i ? 'var(--on-ink)' : 'var(--text)',
                }}>A</button>
              ))}
            </div></div>
          <div style={row}><span style={{ fontSize: 13 }}>Paroles</span>{sw(lyrics, () => set('lyrics', !lyrics), 'Afficher les paroles')}</div>
          {withPiano && <div style={row}><span style={{ fontSize: 13 }}>Piano</span>{sw(piano, () => set('piano', !piano), 'Afficher le piano')}</div>}
        </div>
      )}
    </div>
  )
}

/** Prev phrase · play/pause · next phrase (+ piano toggle when asked). */
export function Transport({ withPiano = false }: { withPiano?: boolean }) {
  const { score, isPlaying, play, pause, currentBeat, seekTo, instrumentLoading } = usePlayer()
  const { piano, set } = usePrefs()
  const starts = score?.renderBlocks.map(b => b.measures[0].startBeat) ?? []
  const prev = () => seekTo([...starts].reverse().find(s => s < currentBeat - 1) ?? 0)
  const next = () => { const s = starts.find(x => x > currentBeat); if (s != null) seekTo(s) }
  const round: CSSProperties = { width: 44, height: 44, border: 'none', background: 'transparent', fontSize: 22, color: 'var(--text)' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative' }}>
      <button type="button" aria-label="Phrase précédente" onClick={prev} style={round}>⏮</button>
      <button type="button" aria-label={isPlaying ? 'Pause' : 'Lecture'} disabled={!score || instrumentLoading} onClick={isPlaying ? pause : play} style={{
        width: 64, height: 64, borderRadius: 32, border: 'none', background: 'var(--ink)', color: 'var(--on-ink)', fontSize: 26,
        opacity: !score || instrumentLoading ? 0.4 : 1,
      }}>{instrumentLoading ? '⋯' : isPlaying ? '⏸' : '▶'}</button>
      <button type="button" aria-label="Phrase suivante" onClick={next} style={round}>⏭</button>
      {withPiano && (
        <button type="button" aria-label={piano ? 'Masquer le piano' : 'Afficher le piano'} aria-pressed={piano} onClick={() => set('piano', !piano)} style={{
          position: 'absolute', right: 0, width: 44, height: 44, borderRadius: 22, border: 'none', fontSize: 18,
          background: piano ? 'var(--ink)' : 'var(--bg3)', color: piano ? 'var(--on-ink)' : 'var(--text)',
        }}>🎹</button>
      )}
    </div>
  )
}

/** True on wide screens (desktop web) — switches to the 3-column layout. */
export function useWide(): boolean {
  const q = '(min-width: 1024px)'
  return useSyncExternalStore(
    cb => { const m = window.matchMedia(q); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) },
    () => window.matchMedia(q).matches,
  )
}


/** Phone held sideways: wide but short. Takes priority over the desktop layout. */
export function useLandscape(): boolean {
  const q = '(orientation: landscape) and (max-height: 520px)'
  return useSyncExternalStore(
    cb => { const m = window.matchMedia(q); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) },
    () => window.matchMedia(q).matches,
  )
}

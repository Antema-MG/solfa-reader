import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { Voice } from '../../types'
import { usePlayer } from '../../state/PlayerContext'
import { usePrefs, type FontSize } from '../../state/PrefsContext'
import { TONICS, degreeToMidi, VOICE_BASE_OCTAVE } from '../../domain/pitch'
import Keyboard from '../Keyboard/Keyboard'
import { variantFromTimbre } from '../../types/music'

/* ───────────────────────────────────────────────────────────────
 * Shared controls — same look on phone portrait, phone landscape and web,
 * ported 1:1 from the design canvas ("Msolfa — modes mobile").
 * ─────────────────────────────────────────────────────────────── */

export const INK = '#1D1D1F'
export const TEXT2 = '#6E6E73'
export const ACCENT = '#85632A'
export const CUR = '#FFF6E3'
export const VOICES: Voice[] = ['S', 'A', 'T', 'B']
export const VCOLOR: Record<Voice, string> = { S: '#B3261E', A: '#1F5BB5', T: '#3D6E12', B: '#8A4C08' }

/** "Sib" → "Si♭", "Fa#" → "Fa♯". */
export const tonicName = (label: string) => label.replace('b', '♭').replace('#', '♯')
export function useTonicLabel(): string {
  const { tonic } = usePlayer()
  return tonicName(TONICS.find(([k]) => k === tonic)?.[1] ?? tonic)
}

export const tempoWord = (t: number) => t < 60 ? 'Largo' : t < 76 ? 'Adagio' : t < 108 ? 'Andante' : t < 132 ? 'Allegro' : 'Presto'

/** Close on Escape while `open`. */
function useEscape(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, close])
}

const GLASS: CSSProperties = {
  background: 'rgba(250,250,252,0.84)', WebkitBackdropFilter: 'blur(30px) saturate(180%)', backdropFilter: 'blur(30px) saturate(180%)',
  boxShadow: '0 16px 48px rgba(0,0,0,0.22), 0 0 0 0.5px rgba(0,0,0,0.14)',
}
const Scrim = ({ onClick, tint = false }: { onClick: () => void; tint?: boolean }) => (
  <button type="button" aria-label="Fermer" tabIndex={-1} onClick={onClick}
    style={{ position: 'fixed', inset: 0, zIndex: 40, border: 'none', background: tint ? 'rgba(29,29,31,0.06)' : 'transparent', cursor: 'default' }} />
)

/* ── Icons used by the canvas (exact paths) ───────────────────── */
type IP = { size?: number; color?: string }
export const SpeakerIcon = ({ size = 18, on = false }: { size?: number; on?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 5 6 9H3v6h3l5 4z" fill={on ? 'currentColor' : 'none'} /><path d="M15.5 8.5a5 5 0 0 1 0 7" />{on && <path d="M18.5 5.5a9 9 0 0 1 0 13" />}
  </svg>
)
export const LoopIcon = ({ size = 20 }: IP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M17 2l3 3-3 3M3 11V9a4 4 0 0 1 4-4h13M7 22l-3-3 3-3M21 13v2a4 4 0 0 1-4 4H4" /></svg>
)
export const PianoIcon = ({ size = 20 }: IP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M8 5v9M12 5v9M16 5v9" /></svg>
)
/** Four staggered notes = the four starting notes, one after the other. */
export const ClefsIcon = ({ size = 20 }: IP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 17v-3M10 17V9M15 17v-6M20 17V5" /><circle cx="5" cy="19.5" r="0.6" /><circle cx="10" cy="19.5" r="0.6" /><circle cx="15" cy="19.5" r="0.6" /><circle cx="20" cy="19.5" r="0.6" /></svg>
)
export const PrevIcon = ({ size = 26 }: IP) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zM20 5.5v13L9 12z" /></svg>
export const NextIcon = ({ size = 26 }: IP) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5.5v13L15 12z" /></svg>
export const PlayIcon = ({ size = 22 }: IP) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
export const PauseIcon = ({ size = 22 }: IP) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
const Dots = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5.5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="18.5" cy="12" r="1.8" /></svg>

/* ── iOS switch 51×31 ─────────────────────────────────────────── */
export function IosSwitch({ on, flip, label }: { on: boolean; flip: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={flip} style={{
      flex: 'none', position: 'relative', width: 51, height: 31, borderRadius: 16, border: 'none', padding: 0,
      background: on ? '#34C759' : 'rgba(120,120,128,0.32)', transition: 'background .2s',
    }}><span style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 27, height: 27, borderRadius: 14, background: '#FFFFFF', boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.16)', transition: 'left .2s' }} /></button>
  )
}

/* ── ⋯ Affichage (zoom · texte · piano · paroles) ─────────────── */
const hair = <span aria-hidden="true" style={{ height: 0.5, background: 'rgba(60,60,67,0.3)' }} />
export function DisplayMenu({ piano, togglePiano }: { piano: boolean; togglePiano: () => void }) {
  const { zoom, fontSize, lyrics, set } = usePrefs()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  useEscape(open, close)
  const step = (d: number) => set('zoom', Math.min(160, Math.max(60, zoom + d)))
  const fs = (i: FontSize, px: number): CSSProperties => {
    const on = fontSize === i
    return {
      width: 34, height: 30, padding: 0, borderRadius: 7, border: 'none', fontWeight: 600, fontSize: px, color: INK,
      background: on ? '#FFFFFF' : 'transparent', boxShadow: on ? '0 2px 5px rgba(0,0,0,0.16), 0 0 0 0.5px rgba(0,0,0,0.04)' : undefined,
    }
  }
  const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, minHeight: 54, padding: '0 14px' }
  const ico = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: TEXT2, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const
  return (
    <div style={{ position: 'relative', flex: 'none' }}>
      <button type="button" aria-label="Affichage" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(o => !o)}
        style={{ width: 44, height: 44, border: 'none', background: 'transparent', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ width: 32, height: 32, borderRadius: 16, background: open ? 'rgba(120,120,128,0.28)' : 'rgba(120,120,128,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK }}><Dots /></span>
      </button>
      {open && <>
        <Scrim onClick={close} />
        <div role="dialog" aria-label="Affichage" style={{ ...GLASS, position: 'absolute', top: 48, right: 0, width: 272, zIndex: 50, borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', color: INK }}>
          <div role="group" aria-label="Zoom" style={{ display: 'flex', alignItems: 'stretch', height: 52 }}>
            <button type="button" aria-label="Dézoomer" onClick={() => step(-10)} style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: INK }}>A</button>
            <span aria-hidden="true" style={{ flex: 'none', width: 0.5, margin: '12px 0', background: 'rgba(60,60,67,0.3)' }} />
            <span style={{ flex: 'none', minWidth: 86, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600 }}>{zoom} %</span>
            <span aria-hidden="true" style={{ flex: 'none', width: 0.5, margin: '12px 0', background: 'rgba(60,60,67,0.3)' }} />
            <button type="button" aria-label="Zoomer" onClick={() => step(10)} style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 24, fontWeight: 600, color: INK }}>A</button>
          </div>
          {hair}
          <div style={row}>
            <svg {...ico}><path d="M2.5 19 8 5l5.5 14M4.5 14h7M14.5 19l3-8 3 8M15.7 16.5h4.6" /></svg>
            <span style={{ flex: 1, minWidth: 0, fontSize: 16 }}>Texte</span>
            <div role="group" aria-label="Taille du texte" style={{ flex: 'none', display: 'flex', padding: 2, borderRadius: 9, background: 'rgba(118,118,128,0.14)' }}>
              {([['Petit', 12], ['Moyen', 15], ['Grand', 18]] as const).map(([l, px], i) => (
                <button key={l} type="button" aria-pressed={fontSize === i} aria-label={l} onClick={() => set('fontSize', i as FontSize)} style={fs(i as FontSize, px)}>A</button>
              ))}
            </div>
          </div>
          <span aria-hidden="true" style={{ height: 0.5, marginLeft: 46, background: 'rgba(60,60,67,0.3)' }} />
          <div style={row}>
            <svg {...ico}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M8 5v9M12 5v9M16 5v9" /></svg>
            <span style={{ flex: 1, minWidth: 0, fontSize: 16 }}>Piano</span>
            <IosSwitch on={piano} flip={togglePiano} label="Afficher le piano" />
          </div>
          <span aria-hidden="true" style={{ height: 0.5, marginLeft: 46, background: 'rgba(60,60,67,0.3)' }} />
          <div style={row}>
            <svg {...ico}><path d="M5 7h14M5 12h14M5 17h9" /></svg>
            <span style={{ flex: 1, minWidth: 0, fontSize: 16 }}>Paroles</span>
            <IosSwitch on={lyrics} flip={() => set('lyrics', !lyrics)} label="Afficher les paroles" />
          </div>
        </div>
      </>}
    </div>
  )
}

/* ── Clé: speaker + "do = La♭" (tap = hear the do) | ⌄ (choose) ── */
const chipOn = (on: boolean): CSSProperties => ({
  height: 36, border: 'none', borderRadius: 10, padding: 0, fontSize: 12.5, fontWeight: 700,
  background: on ? INK : '#F2F2F7', color: on ? '#FFFFFF' : INK,
})
export function KeyPill() {
  const { tonic, setTonic, score, playKey, playClefs } = usePlayer()
  const label = useTonicLabel()
  const [lit, setLit] = useState(false)
  const [open, setOpen] = useState(false)
  const timer = useRef<number>()
  const close = () => setOpen(false)
  useEscape(open, close)
  const hear = () => { playKey(); setLit(true); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setLit(false), 1500) }
  const orig = score?.metadata.key
  return (
    <div style={{ position: 'relative', flex: 'none' }}>
      <div role="group" aria-label="Clé du chant" style={{ width: 150, height: 40, display: 'flex', gap: 2, borderRadius: 12, background: '#FFFFFF', overflow: 'hidden' }}>
        <button type="button" onClick={hear} aria-label={`Écouter la clé : do égale ${label}`} style={{
          flex: 1, minWidth: 0, height: 40, border: 'none', padding: '0 6px 0 12px', fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          background: lit ? CUR : 'transparent', color: lit ? ACCENT : INK, transition: 'background .15s',
        }}><SpeakerIcon on={lit} /><span>do = {label}</span></button>
        <button type="button" onClick={() => setOpen(o => !o)} aria-label="Choisir la clé" aria-expanded={open}
          style={{ flex: 'none', width: 34, height: 40, border: 'none', background: open ? '#F2F2F7' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={TEXT2} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>
      {open && <>
        <Scrim onClick={close} tint />
        <section role="dialog" aria-label="Clé du chant" style={{ position: 'absolute', zIndex: 50, left: 0, top: 48, width: 310, maxWidth: 'calc(100vw - 16px)', boxSizing: 'border-box', padding: 12, borderRadius: 16, background: '#FFFFFF', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>Clé du chant</span>
            <span style={{ fontSize: 12, color: TEXT2 }}>do = {label}</span>
          </div>
          <button type="button" onClick={hear} style={{ height: 44, border: 'none', borderRadius: 12, background: INK, color: '#FFFFFF', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <PlayIcon size={16} /><span>Écouter le do · {label}</span>
          </button>
          <button type="button" onClick={playClefs} style={{ height: 44, border: 'none', borderRadius: 12, background: '#F2F2F7', color: INK, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <ClefsIcon size={18} /><span>Les clés · S A T B puis ensemble</span>
          </button>
          <div role="radiogroup" aria-label="Tonalité" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 4 }}>
            {TONICS.map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={tonic === k} onClick={() => { setTonic(k); window.setTimeout(playKey, 30) }} style={chipOn(tonic === k)}>{tonicName(l)}{k === orig ? ' •' : ''}</button>
            ))}
          </div>
          <span style={{ fontSize: 11.5, color: TEXT2 }}>Le solfège reste le même, seule la hauteur change. • = clé d’origine.</span>
        </section>
      </>}
    </div>
  )
}

/* ── Tempo: − ♩ 80 + (tap the value = slider + presets) ───────── */
export function TempoPill() {
  const { tempo, setTempo, score } = usePlayer()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  useEscape(open, close)
  const orig = score?.metadata.tempo ?? 80
  const nudge = (d: number) => setTempo(Math.min(240, Math.max(30, tempo + d)))
  const side: CSSProperties = { flex: 'none', width: 36, height: 40, border: 'none', background: 'transparent', fontSize: 20, color: INK }
  return (
    <div style={{ position: 'relative', flex: 'none' }}>
      <div role="group" aria-label="Tempo" style={{ width: 140, height: 40, display: 'flex', borderRadius: 12, background: '#FFFFFF', overflow: 'hidden' }}>
        <button type="button" onClick={() => nudge(-5)} aria-label="Plus lent" style={side}>−</button>
        <button type="button" onClick={() => setOpen(o => !o)} aria-label="Régler le tempo" aria-expanded={open} style={{
          flex: 1, minWidth: 0, height: 40, border: 'none', padding: 0, fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          background: open ? '#F2F2F7' : 'transparent', color: tempo === orig ? INK : ACCENT,
        }}>
          <svg width="12" height="14" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true"><ellipse cx="4" cy="12.5" rx="3.4" ry="2.5" transform="rotate(-20 4 12.5)" /><path d="M6.8 12V1.5h1.3V12z" /></svg>
          <span>{tempo}</span>
        </button>
        <button type="button" onClick={() => nudge(5)} aria-label="Plus vite" style={side}>+</button>
      </div>
      {open && <>
        <Scrim onClick={close} tint />
        <section role="dialog" aria-label="Tempo" style={{ position: 'absolute', zIndex: 50, right: 0, top: 48, width: 276, maxWidth: 'calc(100vw - 16px)', boxSizing: 'border-box', padding: 12, borderRadius: 16, background: '#FFFFFF', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>Tempo</span>
            <span style={{ fontSize: 12, color: TEXT2 }}>original · {orig}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em' }}>{tempo}</span>
            <span style={{ fontSize: 13, color: TEXT2 }}>BPM · {tempoWord(tempo)}</span>
          </div>
          <input type="range" min={30} max={240} step={1} value={tempo} aria-label="Tempo en battements par minute" onChange={e => setTempo(+e.target.value)} style={{ width: '100%', height: 32, margin: 0, accentColor: ACCENT }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4 }}>
            {[...new Set([60, orig, 100, 120])].sort((a, b) => a - b).map(b => (
              <button key={b} type="button" aria-pressed={tempo === b} onClick={() => setTempo(b)} style={chipOn(tempo === b)}>{b === orig ? `${b} ·` : b}</button>
            ))}
          </div>
        </section>
      </>}
    </div>
  )
}

/* ── Compact pickers for the portrait transport (bottom sheet) ── */
export type PickOpt = { value: string; label: string; on: boolean }
export function PickerSheet({ title, options, onPick, onClose, top }: { title: string; options: PickOpt[]; onPick: (v: string) => void; onClose: () => void; top?: ReactNode }) {
  useEscape(true, onClose)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <button type="button" aria-label="Fermer" onClick={onClose} style={{ flex: 1, border: 'none', background: 'rgba(0,0,0,0.28)' }} />
      <div role="dialog" aria-label={title} style={{ background: '#FFFFFF', borderRadius: '14px 14px 0 0', padding: '8px 16px max(30px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', maxHeight: '70dvh', overflowY: 'auto' }}>
        <span aria-hidden="true" style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: 3, background: '#C7C7CC', marginBottom: 8, flex: 'none' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT2, letterSpacing: '0.06em', padding: '4px 4px 6px' }}>{title}</span>
        {top}
        {options.map(o => (
          <button key={o.value} type="button" onClick={() => onPick(o.value)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, padding: '0 4px', border: 'none', borderTop: '1px solid #EFEFF4', background: 'transparent', fontSize: 16, color: INK, textAlign: 'left' }}>
            <span>{o.label}</span>
            {o.on && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Piano: the full cream/lacquer keyboard, scaled down; keys light up per voice ── */
const KB_LOW = 24                                    // C1, left edge of the keybed
export function PianoStrip({ height = 86, zoom = 0.62 }: { height?: number; zoom?: number }) {
  const { litMidis, tonic, timbre, instrumentLoading, playNote } = usePlayer()
  const box = useRef<HTMLDivElement>(null)
  // Follow the singers: scroll only when a sounding note leaves the visible window.
  useEffect(() => {
    const el = box.current, ms = Object.values(litMidis)
    if (!el || !ms.length) return
    const px = (m: number) => ((m - KB_LOW) * 7 / 12) * 24 * zoom + 8 * zoom
    const lo = Math.min(...ms.map(px)), hi = Math.max(...ms.map(px))
    if (lo < el.scrollLeft + 12 || hi > el.scrollLeft + el.clientWidth - 12) el.scrollTo({ left: Math.max(0, (lo + hi) / 2 - el.clientWidth / 2), behavior: 'smooth' })
  }, [litMidis, zoom])
  return (
    <div ref={box} aria-label="Piano" style={{ overflowX: 'auto', overflowY: 'hidden', borderRadius: 12, background: '#F5F5F7', height }}>
      <div style={{ zoom, width: 'max-content' }}>
        <Keyboard variant={variantFromTimbre(timbre)} litMidis={litMidis} tonic={tonic} disabled={instrumentLoading} onPress={playNote} />
      </div>
    </div>
  )
}

/** Piano shown or not — separate setting on web / phone portrait / phone landscape. */
export function usePianoPref(kind: 'web' | 'phone' | 'landscape'): [boolean, () => void] {
  const { piano, pianoM, pianoL, set } = usePrefs()
  if (kind === 'web') return [piano, () => set('piano', !piano)]
  if (kind === 'landscape') return [pianoL, () => set('pianoL', !pianoL)]
  return [pianoM, () => set('pianoM', !pianoM)]
}

/** Loop · prev · play · next · piano — row used under the score (portrait + web). */
export function TransportRow({ piano, togglePiano, big = true }: { piano: boolean; togglePiano: () => void; big?: boolean }) {
  const { score, isPlaying, play, pause, currentBeat, seekTo, instrumentLoading, loop, toggleLoop } = usePlayer()
  const starts = score?.renderBlocks.map(b => b.measures[0].startBeat) ?? []
  const prev = () => seekTo([...starts].reverse().find(s => s < currentBeat - 1) ?? 0)
  const next = () => { const s = starts.find(x => x > currentBeat); if (s != null) seekTo(s) }
  const off = !score || instrumentLoading
  const circle = (on: boolean, onBg = INK, onFg = '#FFFFFF'): CSSProperties => ({ width: 40, height: 40, borderRadius: 20, border: 'none', background: on ? onBg : '#F5F5F7', color: on ? onFg : INK, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' })
  const bare: CSSProperties = { width: 44, height: 40, border: 'none', background: 'transparent', color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }
  void big
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <button type="button" aria-label="Boucler la phrase" aria-pressed={loop} onClick={toggleLoop} style={circle(loop, CUR, ACCENT)}><LoopIcon /></button>
      <button type="button" aria-label="Phrase précédente" onClick={prev} style={bare}><PrevIcon /></button>
      <button type="button" aria-label={isPlaying ? 'Pause' : 'Lecture'} disabled={off} onClick={isPlaying ? pause : play}
        style={{ width: 50, height: 50, borderRadius: 25, border: 'none', background: INK, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', opacity: off ? 0.35 : 1 }}>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button type="button" aria-label="Phrase suivante" onClick={next} style={bare}><NextIcon /></button>
      <button type="button" aria-label={piano ? 'Masquer le piano' : 'Afficher le piano'} aria-pressed={piano} title={piano ? 'Masquer le piano' : 'Afficher le piano'} onClick={togglePiano} style={circle(piano)}><PianoIcon /></button>
    </div>
  )
}

/** 3px progress line pinned to the top of its (relative) parent. */
export function TopProgress({ color = INK }: { color?: string }) {
  const { score, currentBeat } = usePlayer()
  const pct = score ? Math.min(100, (currentBeat / score.totalBeats) * 100) : 0
  return (
    <div role="progressbar" aria-label="Avancement" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#E5E5EA' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: color }} />
    </div>
  )
}

export { degreeToMidi, VOICE_BASE_OCTAVE }

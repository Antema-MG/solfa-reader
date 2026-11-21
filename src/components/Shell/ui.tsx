import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { INSTRUMENTS, SHORT_SOUND } from '../../domain/sounds'
import { Icon } from './Icon'
import type { Voice } from '../../types'
import { usePlayer } from '../../state/PlayerContext'
import { usePrefs, type FontSize } from '../../state/PrefsContext'
import { TONICS } from '../../domain/pitch'
import { INSTRUMENT_BY_ID, INSTRUMENTS as INSTRUMENT_LIST, type InstrumentId } from '../../types/music'
import { SUNG_STYLES, SUNG_LABEL, isSung } from '../../domain/choir'
import RecordChoir from '../Choir/RecordChoir'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']
const COLOR: Record<Voice, string> = { S: 'var(--s)', A: 'var(--a)', T: 'var(--t)', B: 'var(--b)' }

export const pill = (on: boolean, h = 32): CSSProperties => ({
  height: h, padding: '0 12px', borderRadius: h / 2, border: on ? 'none' : '1px solid var(--border2)',
  background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--on-ink)' : 'var(--text2)',
  fontSize: 13, fontWeight: 700, flex: 'none',
})

const VOICE_LABEL: Record<Voice, string> = { S: 'Soprano', A: 'Alto', T: 'Ténor', B: 'Basse' }

/**
 * The bar above the score: S A T B (tap = mute, ring = "je chante") and, right
 * next to them, the three settings people actually change while rehearsing.
 */
export function VoiceBar() {
  const { muted, solo, toggleMute } = usePlayer()
  const { myVoice } = usePrefs()
  return (
    <div style={{ display: 'flex', gap: '6px 10px', flexWrap: 'wrap', alignItems: 'center' }}>
      <div role="group" aria-label="Voix" style={{ display: 'flex', gap: 6 }}>
        {VOICES.map(v => {
          const off = solo.size ? !solo.has(v) : muted[v]
          return (
            <button key={v} type="button" aria-pressed={!off} aria-label={VOICE_LABEL[v]} title={VOICE_LABEL[v]} onClick={() => toggleMute(v)} style={{
              width: 32, height: 32, borderRadius: 16, border: `1.5px solid ${COLOR[v]}`, fontSize: 12, fontWeight: 700,
              background: off ? 'transparent' : COLOR[v], color: off ? COLOR[v] : '#fff', opacity: off ? 0.4 : 1,
              boxShadow: v === myVoice ? '0 0 0 2px var(--bg), 0 0 0 3.5px var(--a)' : undefined,
            }}>{v}</button>
          )
        })}
      </div>
      <QuickSettings />
    </div>
  )
}

type QOpt = { value: string; label: string; group?: string; hint?: string }

/**
 * A quiet text button that opens a choice: a menu dropped under it with a mouse
 * (type to filter when `filter`), a bottom sheet on touch. `top` sits above the
 * list (e.g. the tempo −/+), `sheet` replaces the list on touch (e.g. sound tiles).
 */
function QuickPick({ text, title, value, options, onPick, filter = false, top, sheet }: {
  text: string; title: string; value: string; options: QOpt[]; onPick: (v: string) => void
  filter?: boolean; top?: ReactNode; sheet?: ReactNode
}) {
  const mouse = useMouse()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const wrap = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const close = () => { setOpen(false); setQ('') }
  const shown = options.filter(o => fold(o.label).includes(fold(q.trim())))
  useEffect(() => {
    if (!open || !mouse) return
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'center' })
    const out = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) close() }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', out); window.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', out); window.removeEventListener('keydown', esc) }
  }, [open, mouse])
  const pick = (v: string) => { onPick(v); close() }
  return (
    <div ref={wrap} style={{ position: 'relative', minWidth: 0 }}>
      <button type="button" className="qs" aria-label={`${title} : ${text}`} aria-haspopup={mouse ? 'listbox' : 'dialog'} aria-expanded={open} onClick={() => open ? close() : setOpen(true)}>
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
        <Icon name="chevronDown" size={11} style={{ color: 'var(--text3)', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
      </button>
      {open && mouse && (
        <div role="listbox" aria-label={title} style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 60, width: 250, padding: 5, background: 'var(--bg2)', borderRadius: 12,
          boxShadow: '0 12px 32px rgba(0,0,0,.16), 0 0 0 0.5px var(--border2)', display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {top}
          {filter && <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…" aria-label={`Rechercher ${title.toLowerCase()}`}
            onKeyDown={e => { if (e.key === 'Enter' && shown[0]) pick(shown[0].value) }}
            style={{ height: 30, border: 'none', borderRadius: 8, background: 'var(--fill)', padding: '0 9px', fontSize: 13, color: 'var(--text)', outline: 'none' }} />}
          <div ref={list} style={{ maxHeight: 300, overflowY: 'auto' }}>
            {shown.length === 0 && <div style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text2)' }}>Aucun résultat</div>}
            {shown.map((o, i) => (
              <div key={o.value}>
                {o.group && o.group !== shown[i - 1]?.group && <div style={{ fontSize: 12, color: 'var(--text2)', padding: '8px 10px 3px 28px' }}>{o.group}</div>}
                <button type="button" role="option" aria-selected={o.value === value} className="menu-item" onClick={() => pick(o.value)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: 'none', borderRadius: 7,
                  background: 'transparent', fontSize: 14, textAlign: 'left', color: 'var(--text)',
                }}>
                  <span style={{ width: 14, flex: 'none' }}>{o.value === value && <Icon name="check" size={13} />}</span>
                  <span style={{ flex: 1 }}>{o.label}</span>
                  {o.hint && <span style={{ fontSize: 12, color: 'var(--text3)' }}>{o.hint}</span>}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {open && !mouse && (
        <Sheet title={title} onClose={close}>
          {top}
          {sheet ?? <Options value={value} onPick={pick} options={options.map(o => ({ value: o.value, label: o.label + (o.hint ? ` · ${o.hint}` : '') }))} />}
        </Sheet>
      )}
    </div>
  )
}

const TEMPOS = Array.from({ length: 211 }, (_, i) => 30 + i)
export const SOUND_OPTIONS: QOpt[] = [
  ...SUNG_STYLES.map(x => ({ value: x.id, label: x.hint ? `${x.label} (${x.hint})` : `Chœur « ${x.label} »`, group: 'Voix chantées' })),
  ...INSTRUMENT_LIST.map(i => ({ value: i.id, label: i.label, group: 'Instruments' })),
]

/** `96 BPM ⌄ · Solfège chanté ⌄ · do = Ré ⌄` — the only place tempo, sound and key are set. */
export function QuickSettings() {
  const { tempo, tonic, setTempo, setTonic, score, sung, instrumentId, setSung, setInstrument } = usePlayer()
  const mouse = useMouse()
  const soundLabel = useSoundLabel()
  const orig = score?.metadata.tempo, origKey = score?.metadata.key
  const nudge = (d: number) => setTempo(Math.min(240, Math.max(30, tempo + d)))
  const tonicLabel = TONICS.find(([k]) => k === tonic)?.[1] ?? tonic
  const tempos = mouse ? TEMPOS : [...new Set([60, 70, 80, 90, 100, 110, tempo, ...(orig ? [orig] : [])])].sort((a, b) => a - b)
  const dot = <span aria-hidden style={{ color: 'var(--text3)', fontSize: 12 }}>·</span>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flexWrap: 'wrap' }}>
      <QuickPick text={`${tempo} BPM`} title="Tempo" value={String(tempo)} filter
        options={tempos.map(t => ({ value: String(t), label: `${t} BPM`, hint: t === orig ? 'original' : undefined }))}
        onPick={v => setTempo(+v)}
        top={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: mouse ? '2px 4px 4px 8px' : '0 4px 10px' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{tempo} BPM</span>
          <span className="ios-stepper"><button type="button" aria-label="Plus lent" onClick={() => nudge(-5)}>−</button><i /><button type="button" aria-label="Plus vite" onClick={() => nudge(5)}>+</button></span>
        </div>} />
      {dot}
      <QuickPick text={soundLabel} title="Son" value={sung ?? instrumentId} filter options={SOUND_OPTIONS}
        onPick={v => isSung(v) ? setSung(v) : setInstrument(v as InstrumentId)} sheet={<SoundPicker onCard />} />
      {dot}
      <QuickPick text={`do = ${tonicLabel}`} title="Tonique (do =)" value={tonic}
        options={TONICS.map(([k, l]) => ({ value: k, label: l, hint: k === origKey ? 'original' : undefined }))} onPick={setTonic} />
    </div>
  )
}

/**
 * True with a mouse or trackpad (web on a computer), whatever the window width.
 * Popups follow the input device, not the layout: a narrow or zoomed browser
 * window still gets web menus and centred dialogs, a phone gets bottom sheets.
 */
export function useMouse(): boolean {
  const q = '(hover: hover) and (pointer: fine)'
  return useSyncExternalStore(
    cb => { const m = window.matchMedia(q); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) },
    () => window.matchMedia(q).matches,
  )
}

/** Bottom sheet on touch, centred dialog with a mouse. Closes on backdrop click or Escape. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const mouse = useMouse()
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div onMouseDown={e => { if (e.target === e.currentTarget) onClose() }} style={{
      position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: mouse ? 'center' : 'flex-end', background: 'rgba(0,0,0,.3)', padding: mouse ? 16 : 0,
    }}>
      <div role="dialog" aria-modal="true" aria-label={title} style={{
        background: 'var(--bg2)', width: '100%', maxWidth: mouse ? 440 : 520, maxHeight: mouse ? 'calc(100dvh - 32px)' : '90dvh', overflowY: 'auto',
        borderRadius: mouse ? 14 : '14px 14px 0 0', padding: mouse ? '6px 16px 16px' : '8px 16px max(28px, env(safe-area-inset-bottom))',
        boxShadow: mouse ? '0 20px 60px rgba(0,0,0,.22), 0 0 0 0.5px var(--border2)' : undefined,
      }}>
        {mouse
          ? <div style={{ display: 'flex', alignItems: 'center', padding: '6px 0 10px' }}>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{title}</span>
              <button type="button" aria-label="Fermer" onClick={onClose} style={{ width: 28, height: 28, borderRadius: 14, border: 'none', background: 'var(--fill)', color: 'var(--text2)', display: 'grid', placeItems: 'center' }}><Icon name="close" size={13} /></button>
            </div>
          : <>
              <span aria-hidden style={{ display: 'block', width: 36, height: 5, borderRadius: 3, background: 'var(--border2)', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 17, fontWeight: 600, textAlign: 'center', padding: '2px 4px 10px' }}>{title}</div>
            </>}
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
          {o.value === value && <span style={{ color: 'var(--accent-ink)' }}><Icon name="check" size={18} /></span>}
        </button>
      ))}
    </>
  )
}

export { INSTRUMENTS, SHORT_SOUND }

/** Current main sound, for chips and headers. */
export function useSoundLabel(): string {
  const { sung, instrumentId } = usePlayer()
  return sung ? SUNG_LABEL[sung] : INSTRUMENT_BY_ID[instrumentId]?.label ?? instrumentId
}

const tile = (on: boolean, onCard: boolean): CSSProperties => ({
  minHeight: 48, padding: '6px 8px', borderRadius: 12, border: 'none',
  background: on ? 'var(--bg2)' : onCard ? 'var(--bg3)' : 'var(--bg2)', color: 'var(--text)',
  boxShadow: on ? 'inset 0 0 0 2px var(--text)' : 'none',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 14, fontWeight: on ? 600 : 400,
})

/** iOS-style slider row: label left, value right, track underneath. */
function Slider({ label, value, min, max, unit = '', onChange }: { label: string; value: number; min: number; max: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <label className="ios-row stack">
      <span style={{ display: 'flex', justifyContent: 'space-between' }}><span>{label}</span><span className="value">{value}{unit}</span></span>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(+e.target.value)} style={{ width: '100%', accentColor: 'var(--accent-ink)' }} />
    </label>
  )
}

const Chevron = () => <svg width="8" height="13" viewBox="0 0 8 13" aria-hidden="true" style={{ flex: 'none' }}><path d="M1.5 1.5 6.5 6.5l-5 5" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>

/**
 * Sound picker: realistic sung choir or a sampled instrument as tiles, then the
 * choir rows (record real voices, effects). `effectsOnly`: just those rows, as
 * the "Le chœur" group. `onCard`: drawn on a white surface (sheet, popover).
 */
export function SoundPicker({ onCard = false, effectsOnly = false }: { onCard?: boolean; effectsOnly?: boolean }) {
  const { sung, instrumentId, setSung, setInstrument } = usePlayer()
  const { singers, reverb, mySound, set } = usePrefs()
  const [recording, setRecording] = useState(false)
  const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: 8 }
  const sungInUse = !!sung || SUNG_STYLES.some(x => x.id === mySound)
  const recordedInUse = sung === 'recorded' || mySound === 'recorded'
  const rows = <>
    {recordedInUse && (
      <button type="button" className="ios-row" onClick={() => setRecording(true)}>
        <span aria-hidden style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--red-btn)', flex: 'none' }} />
        <span style={{ flex: 1 }}>Enregistrer les vraies voix</span><Chevron />
      </button>
    )}
    {sungInUse && <>
      <Slider label="Chanteurs par pupitre" value={singers} min={1} max={6} onChange={v => set('singers', v)} />
      <Slider label="Réverbération" value={reverb} min={0} max={100} unit=" %" onChange={v => set('reverb', v)} />
    </>}
    {recording && <RecordChoir onClose={() => setRecording(false)} />}
  </>
  // Chorale panel: the sound itself is chosen next to S A T B, only the choir rows live here.
  if (effectsOnly) return recordedInUse || sungInUse
    ? <section aria-label="Le chœur"><div className="ios-caption">Le chœur</div><div className={`ios-group${onCard ? ' on-card' : ''}`}>{rows}</div></section>
    : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div className="ios-caption">Voix chantées</div>
        <div style={grid}>
          {SUNG_STYLES.map(x => (
            <button key={x.id} type="button" aria-pressed={sung === x.id} onClick={() => setSung(x.id)}
              style={{ ...tile(sung === x.id, onCard), gridColumn: x.hint ? 'span 2' : undefined }}>
              {x.id === 'recorded' ? 'Vraies voix' : x.hint ? 'Do ré mi' : x.label}
              {x.hint && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text2)' }}>{x.id === 'recorded' ? 'chœur enregistré' : 'solfège chanté'}</span>}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="ios-caption">Instruments</div>
        <div style={grid}>
          {(INSTRUMENTS.includes(instrumentId) ? INSTRUMENTS : [instrumentId, ...INSTRUMENTS]).map(id => {
            const on = !sung && instrumentId === id
            return <button key={id} type="button" aria-pressed={on} onClick={() => setInstrument(id)} style={tile(on, onCard)}>{SHORT_SOUND[id] ?? INSTRUMENT_BY_ID[id]?.label ?? id}</button>
          })}
        </div>
      </div>
      {(recordedInUse || sungInUse) && <div className={`ios-group${onCard ? ' on-card' : ''}`}>{rows}</div>}
    </div>
  )
}

/** Desktop web (not phone landscape): mouse + keyboard, so filterable selects beat sheets. */
export function useDesktop(): boolean {
  const wide = useWide(), landscape = useLandscape()
  return wide && !landscape
}

type ComboOpt = { value: string; label: string; group?: string; disabled?: boolean }
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Select input you can type into to filter (accent-insensitive). ↑ ↓ Entrée Échap. */
export function Combo({ label, value, options, onPick, row = false }: { label: string; value: string; options: ComboOpt[]; onPick: (v: string) => void; row?: boolean }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hi, setHi] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const current = options.find(o => o.value === value)?.label ?? value
  const shown = options.filter(o => !o.disabled && fold(o.label).includes(fold(query.trim())))
  useEffect(() => { listRef.current?.querySelector(`[data-i="${hi}"]`)?.scrollIntoView({ block: 'nearest' }) }, [hi, open])
  const pick = (o?: ComboOpt) => { if (o) onPick(o.value); setOpen(false); setQuery('') }
  const start = () => { setOpen(true); setQuery(''); setHi(Math.max(0, options.filter(o => !o.disabled).findIndex(o => o.value === value))) }
  return (
    <label className={row ? 'ios-row' : undefined} style={row ? undefined : { display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, position: 'relative' }}>
      <span style={row ? { flex: 'none' } : { fontSize: 12, color: 'var(--text2)', paddingLeft: 2 }}>{label}</span>
      <input role="combobox" aria-expanded={open} aria-controls={id} aria-autocomplete="list"
        aria-activedescendant={open && shown[hi] ? `${id}-${hi}` : undefined}
        value={open ? query : current} placeholder={current}
        onFocus={start} onClick={() => !open && start()} onBlur={() => { setOpen(false); setQuery('') }}
        onChange={e => { setQuery(e.target.value); setHi(0); setOpen(true) }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); open ? setHi(h => Math.min(shown.length - 1, h + 1)) : start() }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(0, h - 1)) }
          else if (e.key === 'Enter') { e.preventDefault(); pick(shown[hi]); (e.target as HTMLInputElement).blur() }
          else if (e.key === 'Escape') { setOpen(false); setQuery(''); (e.target as HTMLInputElement).blur() }
        }}
        style={row ? {
          flex: 1, minWidth: 0, height: 30, border: 'none', background: 'transparent', textAlign: 'right',
          color: 'var(--text2)', fontSize: 15, padding: '0 18px 0 0', textOverflow: 'ellipsis',
        } : {
          height: 34, minWidth: 0, borderRadius: 8, border: 'none', background: 'var(--fill)',
          color: 'var(--text)', fontSize: 14, padding: '0 26px 0 10px', boxSizing: 'border-box', textOverflow: 'ellipsis',
        }} />
      <svg aria-hidden width="9" height="14" viewBox="0 0 9 14" style={{ position: 'absolute', right: row ? 16 : 9, bottom: row ? undefined : 10, pointerEvents: 'none' }}>
        <path d="M1.5 5 4.5 2l3 3M1.5 9l3 3 3-3" fill="none" stroke="var(--text2)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {open && (
        <ul id={id} role="listbox" ref={listRef} style={{
          position: 'absolute', top: '100%', left: row ? 'auto' : 0, right: row ? 8 : 0, width: row ? 260 : undefined, minWidth: 200, marginTop: 4, maxHeight: 320, overflowY: 'auto', zIndex: 60,
          listStyle: 'none', padding: 5, background: 'var(--bg2)', borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,.18), 0 0 0 0.5px var(--border2)',
        }}>
          {shown.length === 0 && <li style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text2)' }}>Aucun résultat</li>}
          {shown.map((o, i) => (
            <li key={o.value}>
              {o.group && o.group !== shown[i - 1]?.group && <div style={{ fontSize: 12, color: 'var(--text2)', padding: '8px 10px 4px 28px' }}>{o.group}</div>}
              <div id={`${id}-${i}`} data-i={i} role="option" aria-selected={o.value === value}
                onMouseDown={e => { e.preventDefault(); pick(o) }} onMouseEnter={() => setHi(i)} style={{
                  padding: '6px 10px', borderRadius: 7, fontSize: 14, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center',
                  background: i === hi ? 'var(--fill)' : 'transparent',
                }}><span style={{ width: 14, flex: 'none', color: 'var(--text)' }}>{o.value === value && <Icon name="check" size={13} />}</span>{o.label}</div>
            </li>
          ))}
        </ul>
      )}
    </label>
  )
}

/** Piano shown or not: its own setting on web (default on) and on phone (default off). */
export function usePiano(): [boolean, () => void] {
  const { piano, pianoM, set } = usePrefs()
  const wide = useWide()
  return wide ? [piano, () => set('piano', !piano)] : [pianoM, () => set('pianoM', !pianoM)]
}

/** "⋯ Affichage" popover: zoom, text size, lyrics, optional piano switch. */
export function DisplayMenu({ withPiano = false }: { withPiano?: boolean }) {
  const { zoom, fontSize, lyrics, set } = usePrefs()
  const [piano, togglePiano] = usePiano()
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
        width: 40, height: 40, borderRadius: 20, border: 'none', display: 'grid', placeItems: 'center',
        background: open ? 'var(--bg4)' : 'transparent', color: 'var(--text)',
      }}><Icon name="more" /></button>
      {open && (
        <div role="dialog" aria-label="Affichage" style={{
          position: 'absolute', right: 0, top: 48, width: 252, zIndex: 40, background: 'var(--bg2)', borderRadius: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,.18), 0 0 0 1px var(--border)', padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={row}><b style={{ fontSize: 13 }}>Affichage</b>
            <button type="button" aria-label="Fermer" onClick={() => setOpen(false)} style={{ width: 30, height: 30, borderRadius: 15, border: 'none', background: 'var(--fill)', color: 'var(--text2)', display: 'grid', placeItems: 'center' }}><Icon name="close" size={14} /></button></div>
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
          {withPiano && <div style={row}><span style={{ fontSize: 13 }}>Piano</span>{sw(piano, togglePiano, 'Afficher le piano')}</div>}
        </div>
      )}
    </div>
  )
}

/** Prev phrase · play/pause · next phrase (+ piano toggle when asked). */
export function Transport({ withPiano = false }: { withPiano?: boolean }) {
  const { score, isPlaying, play, pause, currentBeat, seekTo, instrumentLoading } = usePlayer()
  const [piano, togglePiano] = usePiano()
  const starts = score?.renderBlocks.map(b => b.measures[0].startBeat) ?? []
  const prev = () => seekTo([...starts].reverse().find(s => s < currentBeat - 1) ?? 0)
  const next = () => { const s = starts.find(x => x > currentBeat); if (s != null) seekTo(s) }
  const off = !score || instrumentLoading
  // Apple Music style: bare filled glyphs, no disc; a soft grey circle only while pressed (.tp:active).
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, height: 36, position: 'relative' }}>
      <button type="button" className="tp" aria-label="Phrase précédente" onClick={prev} style={{ width: 32, height: 32, color: 'var(--text2)' }}><Icon name="rewind" size={18} /></button>
      <button type="button" className="tp" aria-label={isPlaying ? 'Pause' : 'Lecture'} disabled={off} onClick={isPlaying ? pause : play}
        style={{ width: 36, height: 36, opacity: off ? 0.35 : 1 }}><Icon name={instrumentLoading ? 'more' : isPlaying ? 'pause' : 'play'} size={24} /></button>
      <button type="button" className="tp" aria-label="Phrase suivante" onClick={next} style={{ width: 32, height: 32, color: 'var(--text2)' }}><Icon name="fastForward" size={18} /></button>
      {withPiano && (
        <button type="button" className="tp" aria-label={piano ? 'Masquer le piano' : 'Afficher le piano'} aria-pressed={piano} onClick={togglePiano}
          style={{ position: 'absolute', right: 0, width: 32, height: 32, color: piano ? 'var(--accent-ink)' : 'var(--text3)' }}><Icon name="piano" size={18} /></button>
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

/** The main sound (sung style or instrument) as a single choice: current value, short label, setter. */
export function useSoundChoice() {
  const { sung, instrumentId, setSung, setInstrument } = usePlayer()
  const value = sung ?? instrumentId
  const short = sung ? (sung === 'recorded' ? 'Vraies voix' : SUNG_LABEL[sung]) : SHORT_SOUND[instrumentId] ?? INSTRUMENT_BY_ID[instrumentId]?.label ?? instrumentId
  const pick = (v: string) => { if (isSung(v)) setSung(v); else setInstrument(v as InstrumentId) }
  return { value, short, pick }
}

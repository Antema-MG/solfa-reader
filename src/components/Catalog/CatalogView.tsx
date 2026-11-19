/// <reference types="vite/client" />
import { useMemo, useState } from 'react'
import { Icon } from '../Shell/Icon'
import { parseMsolfa } from '../../domain/parser'
import type { Score, Voice } from '../../types'
import { useLibrary, newId } from '../../state/LibraryContext'
import ImportSheet from './ImportSheet'
import NewScoreSheet from './NewScoreSheet'
import type { Draft } from '../Editor/GuidedEditor'

// Single source of the catalog location (see catalog/README.md).
// catalog/*.msolfa = repertoire, catalog/_drafts/*.msolfa = to fix. "OK" = parses without error.
const RAW = import.meta.glob(['/catalog/*.msolfa', '/catalog/_drafts/*.msolfa'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>

interface Entry {
  id: string; name: string; text: string; draft: boolean; user?: boolean; origin?: string
  score?: Score; errors: string[]
  title: string; composer: string; haystack: string
}

const VOICES: Voice[] = ['S', 'A', 'T', 'B']
const VOICE_COLOR: Record<Voice, string> = { S: 'var(--s)', A: 'var(--a)', T: 'var(--t)', B: 'var(--b)' }

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function makeEntry(id: string, name: string, text: string, draft: boolean, extra: Partial<Entry> = {}): Entry {
  const r = parseMsolfa(text)
  const score = r.success ? r.file : undefined
  const errors = r.success ? [] : r.errors.map(e => `${e.line ? 'L' + e.line + ' : ' : ''}${e.message}`)
  const m = score?.metadata
  const title = m?.title && m.title !== '-' ? m.title : name.replace(/[-_]+/g, ' ')
  const composer = m?.composer && m.composer !== '-' ? m.composer : ''
  return { id, name, text, draft, score, errors, title, composer, haystack: fold(`${title} ${composer} ${name} ${m?.key ?? ''}`), ...extra }
}

const BUNDLED: Entry[] = Object.entries(RAW).map(([path, text]) =>
  makeEntry(path, path.split('/').pop()!.replace(/\.msolfa$/, ''), text, path.includes('/_drafts/')))

const chip = (active: boolean): React.CSSProperties => ({
  border: '1px solid var(--border2)', borderRadius: 999, padding: '5px 12px',
  fontSize: 12, fontWeight: 700, cursor: 'pointer',
  background: active ? 'var(--accent)' : 'var(--bg4)', color: active ? '#0f0f12' : 'var(--text2)',
})

function Card({ e, onOpen, compact, active }: { e: Entry; onOpen: (e: Entry) => void; compact?: boolean; active?: boolean }) {
  const m = e.score!.metadata
  const present = new Set(e.score!.events.map(ev => ev.voice))
  return (
    <button type="button" onClick={() => onOpen(e)} style={{
      display: 'flex', gap: 12, alignItems: 'stretch', textAlign: 'left', width: '100%',
      background: active ? 'var(--cur)' : 'var(--bg2)', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 12,
      padding: compact ? 8 : 12, color: 'var(--text)', transition: 'border-color .15s, transform .15s',
    }}
      onMouseEnter={ev => { ev.currentTarget.style.borderColor = 'var(--accent)'; ev.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={ev => { ev.currentTarget.style.borderColor = 'var(--border)'; ev.currentTarget.style.transform = 'none' }}
    >
      <div style={{
        flex: 'none', width: compact ? 40 : 52, borderRadius: 8, background: 'var(--bg4)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{m.key}</span>
        <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 4 }}>
          {m.numerator}/{m.denominator}
        </span>
      </div>
      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
          <span title="Partition valide" style={{ flex: 'none', color: 'var(--green)' }}><Icon name="checkCircle" size={15} /></span>
        </div>
        {!compact && <span style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minHeight: 16 }}>
          {e.composer || '—'}
        </span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          <span>{e.score!.measures.length} mes. · {m.tempo} BPM</span>
          {!compact && <span style={{ display: 'flex', gap: 3, marginLeft: 'auto' }}>
            {VOICES.map(v => (
              <i key={v} title={v} style={{
                width: 14, height: 14, borderRadius: 4, fontStyle: 'normal', fontSize: 9, fontWeight: 800,
                display: 'grid', placeItems: 'center',
                background: present.has(v) ? VOICE_COLOR[v] : 'transparent',
                border: `1px solid ${present.has(v) ? VOICE_COLOR[v] : 'var(--border2)'}`,
                color: present.has(v) ? '#0f0f12' : 'var(--text3)',
              }}>{v}</i>
            ))}
          </span>}
        </div>
      </div>
    </button>
  )
}

export default function CatalogView({ onOpen, onFix, onCreate, compact = false, activeText }: {
  onOpen: (text: string) => void; onFix: (d: Draft) => void
  /** A new blank score was saved to the library: open it for editing. */
  onCreate?: (text: string, id: string) => void
  compact?: boolean; activeText?: string
}) {
  const lib = useLibrary()
  const [adding, setAdding] = useState<DOMRect | null>(null)  // the "+" button's box: the web menu drops from it
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState('')
  const [meter, setMeter] = useState<string | null>(null)
  const [key, setKey] = useState<string | null>(null)
  const [showBad, setShowBad] = useState(false)

  const all = useMemo(() => {
    const fixed = new Set(lib.items.map(i => i.origin).filter(Boolean))
    const mine = lib.items.map(i => makeEntry(i.id, i.name, i.text, false, { user: true, origin: i.origin }))
    return [...BUNDLED.filter(e => !fixed.has(e.id)), ...mine].sort((a, b) => a.title.localeCompare(b.title, 'fr'))
  }, [lib.items])
  const ok  = useMemo(() => all.filter(e => e.score && !e.draft), [all])
  const bad = useMemo(() => all.filter(e => !e.score || e.draft), [all])
  const meters = useMemo(() => [...new Set(ok.map(e => `${e.score!.metadata.numerator}/${e.score!.metadata.denominator}`))].sort(), [ok])
  const keys   = useMemo(() => [...new Set(ok.map(e => e.score!.metadata.key))].sort(), [ok])

  const shown = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean)
    return ok.filter(e => {
      const m = e.score!.metadata
      if (meter && `${m.numerator}/${m.denominator}` !== meter) return false
      if (key && m.key !== key) return false
      return words.every(w => e.haystack.includes(w))
    })
  }, [ok, q, meter, key])

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: compact ? '14px 12px 24px' : '18px 16px 36px' }}>
      <div style={{ maxWidth: compact ? undefined : 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h2 style={{ fontSize: compact ? 18 : 28, fontWeight: 800, letterSpacing: '-.02em' }}>{compact ? 'Partitions' : 'Bibliothèque'}</h2>
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>
            {shown.length === ok.length ? `${ok.length} partitions OK` : `${shown.length} / ${ok.length} partitions`}
          </span>
          <button type="button" aria-label="Ajouter une partition" aria-haspopup="menu" aria-expanded={!!adding} onClick={e => setAdding(e.currentTarget.getBoundingClientRect())}
            style={{ marginLeft: 'auto', width: 36, height: 36, borderRadius: 18, border: 'none', display: 'grid', placeItems: 'center', background: adding ? 'var(--bg4)' : 'var(--fill)', color: 'var(--text)' }}>
            <Icon name="plus" size={20} /></button>
        </div>

        <div style={{ position: 'relative' }}>
          <input
            type="search" value={q} onChange={e => setQ(e.target.value)} autoFocus
            placeholder="Rechercher un titre, un compositeur, une tonalité…"
            style={{
              width: '100%', padding: '11px 14px 11px 38px', fontSize: 14, fontFamily: 'inherit',
              background: 'var(--bg2)', color: 'var(--text)', borderRadius: 10,
              border: '1px solid var(--border2)', outline: 'none',
            }}
          />
          <span style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text3)', pointerEvents: 'none' }}><Icon name="search" size={16} /></span>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>Mesure</span>
          {meters.map(m => <button key={m} type="button" style={chip(meter === m)} onClick={() => setMeter(meter === m ? null : m)}>{m}</button>)}
          <span style={{ fontSize: 13, color: 'var(--text2)', marginLeft: 10 }}>Ton</span>
          {keys.map(k => <button key={k} type="button" style={chip(key === k)} onClick={() => setKey(key === k ? null : k)}>{k}</button>)}
          {(q || meter || key) && (
            <button type="button" onClick={() => { setQ(''); setMeter(null); setKey(null) }}
              style={{ ...chip(false), background: 'transparent', marginLeft: 'auto' }}>Effacer</button>
          )}
        </div>

        {shown.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: compact ? 'minmax(0, 1fr)' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: compact ? 6 : 10 }}>
            {shown.map(e => <Card key={e.id} e={e} compact={compact} active={e.text === activeText} onOpen={x => onOpen(x.text)} />)}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '48px 0' }}>
            Aucune partition ne correspond à « {q || '…'} ».
          </div>
        )}

        {bad.length > 0 && (
          <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <button type="button" onClick={() => setShowBad(s => !s)}
              style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12 }}>
              <Icon name={showBad ? 'chevronDown' : 'chevronRight'} size={12} /> {bad.length} fichier{bad.length > 1 ? 's' : ''} à corriger
            </button>
            {showBad && bad.map(e => (
              <button key={e.id} type="button" onClick={() => onFix({ id: e.user ? e.id : undefined, name: e.name, text: e.text, origin: e.user ? e.origin : e.id })}
                style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, minHeight: 44, border: 'none', background: 'transparent', textAlign: 'left', fontSize: 12, color: 'var(--text2)' }}>
                <b style={{ color: 'var(--s)' }}>{e.name}</b>
                <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--mono)', color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}> — {e.errors.length ? e.errors[0] : 'valide, à promouvoir'}</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-ink)' }}>Corriger</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {adding && <ImportSheet anchor={adding} onClose={() => setAdding(null)}
        onFile={(name, text) => {
          setAdding(null)
          if (parseMsolfa(text).success) { lib.save({ id: newId(name), name, text }); onOpen(text) }
          else onFix({ name, text })
        }}
        onNew={text => { setAdding(null); onFix({ name: 'nouvelle-partition', text }) }}
        onBlank={() => { setAdding(null); setCreating(true) }} />}
      {creating && <NewScoreSheet onClose={() => setCreating(false)} onCreate={(text, title) => {
        const id = newId(title)
        lib.save({ id, name: title, text })
        setCreating(false)
        if (onCreate) onCreate(text, id); else onOpen(text)
      }} />}
    </div>
  )
}

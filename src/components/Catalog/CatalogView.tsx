/// <reference types="vite/client" />
import { useMemo, useState } from 'react'
import { parseMsolfa } from '../../domain/parser'
import type { Score, Voice } from '../../types'

// Single source of the catalog location (see catalog/README.md).
// catalog/*.msolfa = repertoire, catalog/_drafts/*.msolfa = to fix. "OK" = parses without error.
const RAW = import.meta.glob(['/catalog/*.msolfa', '/catalog/_drafts/*.msolfa'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>

interface Entry {
  id: string; name: string; text: string; draft: boolean
  score?: Score; errors: string[]
  title: string; composer: string; haystack: string
}

const VOICES: Voice[] = ['S', 'A', 'T', 'B']
const VOICE_COLOR: Record<Voice, string> = { S: 'var(--s)', A: 'var(--a)', T: 'var(--t)', B: 'var(--b)' }

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const ENTRIES: Entry[] = Object.entries(RAW).map(([path, text]) => {
  const name = path.split('/').pop()!.replace(/\.msolfa$/, '')
  const r = parseMsolfa(text)
  const score = r.success ? r.file : undefined
  const errors = r.success ? [] : r.errors.map(e => `${e.line ? 'L' + e.line + ' : ' : ''}${e.message}`)
  const m = score?.metadata
  const title = m?.title && m.title !== '-' ? m.title : name.replace(/[-_]+/g, ' ')
  const composer = m?.composer && m.composer !== '-' ? m.composer : ''
  return { id: path, name, text, draft: path.includes('/_drafts/'), score, errors, title, composer, haystack: fold(`${title} ${composer} ${name} ${m?.key ?? ''}`) }
}).sort((a, b) => a.title.localeCompare(b.title, 'fr'))

const chip = (active: boolean): React.CSSProperties => ({
  border: '1px solid var(--border2)', borderRadius: 999, padding: '5px 12px',
  fontSize: 12, fontWeight: 700, cursor: 'pointer',
  background: active ? 'var(--accent)' : 'var(--bg4)', color: active ? '#0f0f12' : 'var(--text2)',
})

function Card({ e, onOpen }: { e: Entry; onOpen: (e: Entry) => void }) {
  const m = e.score!.metadata
  const present = new Set(e.score!.events.map(ev => ev.voice))
  return (
    <button type="button" onClick={() => onOpen(e)} style={{
      display: 'flex', gap: 12, alignItems: 'stretch', textAlign: 'left', width: '100%',
      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
      padding: 12, color: 'var(--text)', transition: 'border-color .15s, transform .15s',
    }}
      onMouseEnter={ev => { ev.currentTarget.style.borderColor = 'var(--accent)'; ev.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={ev => { ev.currentTarget.style.borderColor = 'var(--border)'; ev.currentTarget.style.transform = 'none' }}
    >
      <div style={{
        flex: 'none', width: 52, borderRadius: 8, background: 'var(--bg4)',
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
          <span title="Partition valide" style={{ flex: 'none', fontSize: 10, fontWeight: 800, color: 'var(--green)' }}>✓ OK</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minHeight: 16 }}>
          {e.composer || '—'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          <span>{e.score!.measures.length} mes. · {m.tempo} BPM</span>
          <span style={{ display: 'flex', gap: 3, marginLeft: 'auto' }}>
            {VOICES.map(v => (
              <i key={v} title={v} style={{
                width: 14, height: 14, borderRadius: 4, fontStyle: 'normal', fontSize: 9, fontWeight: 800,
                display: 'grid', placeItems: 'center',
                background: present.has(v) ? VOICE_COLOR[v] : 'transparent',
                border: `1px solid ${present.has(v) ? VOICE_COLOR[v] : 'var(--border2)'}`,
                color: present.has(v) ? '#0f0f12' : 'var(--text3)',
              }}>{v}</i>
            ))}
          </span>
        </div>
      </div>
    </button>
  )
}

export default function CatalogView({ onOpen }: { onOpen: (text: string) => void }) {
  const [q, setQ] = useState('')
  const [meter, setMeter] = useState<string | null>(null)
  const [key, setKey] = useState<string | null>(null)
  const [showBad, setShowBad] = useState(false)

  const ok  = useMemo(() => ENTRIES.filter(e => e.score && !e.draft), [])
  const bad = useMemo(() => ENTRIES.filter(e => !e.score || e.draft), [])
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
    <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 36px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Catalogue</h2>
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>
            {shown.length === ok.length ? `${ok.length} partitions OK` : `${shown.length} / ${ok.length} partitions`}
          </span>
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
          <span style={{ position: 'absolute', left: 13, top: 10, color: 'var(--text3)' }}>🔍</span>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Mesure</span>
          {meters.map(m => <button key={m} type="button" style={chip(meter === m)} onClick={() => setMeter(meter === m ? null : m)}>{m}</button>)}
          <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginLeft: 10 }}>Ton</span>
          {keys.map(k => <button key={k} type="button" style={chip(key === k)} onClick={() => setKey(key === k ? null : k)}>{k}</button>)}
          {(q || meter || key) && (
            <button type="button" onClick={() => { setQ(''); setMeter(null); setKey(null) }}
              style={{ ...chip(false), background: 'transparent', marginLeft: 'auto' }}>Effacer</button>
          )}
        </div>

        {shown.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {shown.map(e => <Card key={e.id} e={e} onOpen={x => onOpen(x.text)} />)}
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
              {showBad ? '▾' : '▸'} {bad.length} fichier{bad.length > 1 ? 's' : ''} à corriger
            </button>
            {showBad && bad.map(e => (
              <div key={e.id} style={{ fontSize: 12, padding: '6px 0', color: 'var(--text2)' }}>
                <b style={{ color: '#ff6b6b' }}>{e.name}</b>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--text3)' }}> — {e.errors.length ? `${e.errors[0]}${e.errors.length > 1 ? ` (+${e.errors.length - 1})` : ''}` : 'valide, à promouvoir dans catalog/'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

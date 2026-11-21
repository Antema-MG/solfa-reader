/// <reference types="vite/client" />
import { useMemo, useRef, useState } from 'react'
import { Icon } from '../Shell/Icon'
import { parseMsolfa } from '../../domain/parser'
import type { Score } from '../../types'
import { useLibrary, newId } from '../../state/LibraryContext'
import ImportSheet from './ImportSheet'
import NewScoreSheet from './NewScoreSheet'
import type { Draft } from '../Editor/GuidedEditor'
import { CATALOG_RAW as RAW } from '../../domain/catalogFiles'

interface Entry {
  id: string; name: string; text: string; draft: boolean; user?: boolean; origin?: string
  score?: Score; errors: string[]
  title: string; composer: string; haystack: string
  num: string; recueil: Recueil; meter: string; key: string; sub: string
}
type Recueil = 'ffpm' | 'ff' | 'hira'

const INK = '#1D1D1F', TEXT2 = '#6E6E73', ACCENT = '#85632A', GOLD = '#C8A96E', SEP = '#EFEFF4'
const ellipsis: React.CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function makeEntry(id: string, name: string, text: string, draft: boolean, extra: Partial<Entry> = {}): Entry {
  const r = parseMsolfa(text)
  const score = r.success ? r.file : undefined
  const errors = r.success ? [] : r.errors.map(e => `${e.line ? 'L' + e.line + ' : ' : ''}${e.message}`)
  const m = score?.metadata
  const title = m?.title && m.title !== '-' ? m.title : name.replace(/[-_]+/g, ' ')
  const composer = m?.composer && m.composer !== '-' ? m.composer : ''
  const num = (name.match(/^(\d+|ff\d+)/i)?.[1] ?? '').toLowerCase()
  const recueil: Recueil = /^\d/.test(num) ? 'ffpm' : num ? 'ff' : 'hira'
  const meter = m ? `${m.numerator}/${m.denominator}` : '—'
  const sub = [composer, score ? `${score.measures.length} mes.` : ''].filter(Boolean).join(' · ')
  return { id, name, text, draft, score, errors, title, composer, num: num || '—', recueil, meter, key: m?.key ?? '—', sub,
    haystack: fold(`${title} ${composer} ${name} ${m?.key ?? ''} ${num}`), ...extra }
}

const BUNDLED: Entry[] = Object.entries(RAW).map(([path, text]) =>
  makeEntry(path, path.split('/').pop()!.replace(/\.msolfa$/, ''), text, path.includes('/_drafts/')))


const RECUEILS: { id: Recueil; label: string; kicker: string; web: string }[] = [
  { id: 'ffpm', label: 'FFPM', kicker: 'FIHIRANA', web: 'FFPM' },
  { id: 'ff', label: 'FF', kicker: 'FANAMPINY', web: 'Fihirana Fanampiny' },
  { id: 'hira', label: 'Hira', kicker: 'CHORALE', web: 'Hira' },
]
type Tab = 'recueils' | 'toutes' | 'programme'
const TABS: [Tab, string][] = [['recueils', 'Recueils'], ['toutes', 'Toutes'], ['programme', 'Programme']]

const SearchIcon = ({ s = 17, w = 2 }: { s?: number; w?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={TEXT2} strokeWidth={w} strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)
const Chevron = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>

/** iOS segmented control on a #E8E8ED track. */
function Seg<T extends string>({ items, value, onPick, h = 32, fs = 13, label }: { items: [T, string][]; value: T; onPick: (v: T) => void; h?: number; fs?: number; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'flex', gap: 2, padding: 2, borderRadius: 10, background: '#E8E8ED' }}>
      {items.map(([id, text]) => {
        const on = id === value
        return (
          <button key={id} type="button" role="radio" aria-checked={on} onClick={() => onPick(id)} style={{
            flex: 1, height: h, border: 'none', borderRadius: 8, padding: '0 12px', fontSize: fs, fontWeight: on ? 600 : 500, color: on ? INK : '#3A3A3C',
            background: on ? '#FFFFFF' : 'transparent', boxShadow: on ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}>{text}</button>
        )
      })}
    </div>
  )
}

function FixList({ bad, onFix, light }: { bad: Entry[]; onFix: (e: Entry) => void; light?: boolean }) {
  const [open, setOpen] = useState(false)
  if (!bad.length) return null
  return (
    <div style={{ marginTop: 4 }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', padding: '8px 2px', color: TEXT2, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={12} /> {bad.length} fichier{bad.length > 1 ? 's' : ''} à corriger
      </button>
      {open && (
        <div style={{ background: light ? 'transparent' : '#FFFFFF', borderRadius: 16, overflow: 'hidden' }}>
          {bad.map(e => (
            <button key={e.id} type="button" onClick={() => onFix(e)} style={{
              display: 'flex', width: '100%', alignItems: 'center', gap: 8, minHeight: 44, border: 'none', borderBottom: `1px solid ${SEP}`, background: 'transparent', textAlign: 'left', fontSize: 12, color: TEXT2, padding: '0 14px',
            }}>
              <b style={{ color: '#B3261E' }}>{e.name}</b>
              <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--mono)', ...ellipsis }}> — {e.errors.length ? e.errors[0] : 'valide, à promouvoir'}</span>
              <span style={{ fontWeight: 700, color: ACCENT }}>Corriger</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CatalogView({ onOpen, onRead, onFix, onCreate, compact = false, landscape = false, activeText }: {
  onOpen: (text: string) => void; onFix: (d: Draft) => void
  /** Open the score on its sheet (landscape "Lire"). */
  onRead?: (text: string) => void
  /** A new blank score was saved to the library: open it for editing. */
  onCreate?: (text: string, id: string) => void
  /** Web column (a card of the desktop layout). */
  compact?: boolean
  /** Phone held sideways: list + detail panel. */
  landscape?: boolean
  activeText?: string
}) {
  const lib = useLibrary()
  const [adding, setAdding] = useState<DOMRect | null>(null)  // the "+" button's box: the web menu drops from it
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('recueils')
  const [recueil, setRecueil] = useState<Recueil | 'all'>('all')
  const [filter, setFilter] = useState<'all' | 'ok' | 'fix'>('all')
  const [sel, setSel] = useState(0)
  const [addKind, setAddKind] = useState<'' | 'file' | 'scan' | 'paste' | 'new'>('')
  const fileRef = useRef<HTMLInputElement>(null)

  const all = useMemo(() => {
    const fixed = new Set(lib.items.map(i => i.origin).filter(Boolean))
    const mine = lib.items.map(i => makeEntry(i.id, i.name, i.text, false, { user: true, origin: i.origin }))
    return [...BUNDLED.filter(e => !fixed.has(e.id)), ...mine].sort((a, b) => a.title.localeCompare(b.title, 'fr'))
  }, [lib.items])
  const ok  = useMemo(() => all.filter(e => e.score && !e.draft), [all])
  const bad = useMemo(() => all.filter(e => !e.score || e.draft), [all])
  const count = (r: Recueil) => ok.filter(e => e.recueil === r).length

  const matches = (e: Entry) => fold(q).split(/\s+/).filter(Boolean).every(w => e.haystack.includes(w))
  const shown = useMemo(() => ok.filter(e => {
    if (tab === 'programme' && !e.user) return false
    if (!compact && tab === 'recueils' && recueil !== 'all' && e.recueil !== recueil) return false
    if (compact && recueil !== 'all' && e.recueil !== recueil) return false
    return matches(e)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [ok, q, tab, recueil, compact])
  const rows = useMemo(() => {
    const pool = filter === 'ok' ? ok : filter === 'fix' ? bad : [...ok, ...bad]
    return pool.filter(matches)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, bad, q, filter])

  const fix = (e: Entry) => onFix({ id: e.user ? e.id : undefined, name: e.name, text: e.text, origin: e.user ? e.origin : e.id })
  const importFile = (name: string, text: string) => {
    if (parseMsolfa(text).success) { lib.save({ id: newId(name), name, text }); onOpen(text) }
    else onFix({ name, text })
  }

  const sheets = (
    <>
      {adding && <ImportSheet anchor={adding} onClose={() => setAdding(null)}
        onFile={(name, text) => { setAdding(null); importFile(name, text) }}
        onNew={text => { setAdding(null); onFix({ name: 'nouvelle-partition', text }) }}
        onBlank={() => { setAdding(null); setCreating(true) }} />}
      {creating && <NewScoreSheet onClose={() => setCreating(false)} onCreate={(text, title) => {
        const id = newId(title)
        lib.save({ id, name: title, text })
        setCreating(false)
        if (onCreate) onCreate(text, id); else onOpen(text)
      }} />}
    </>
  )

  /* ── Web column: search · RECUEILS · PARTITIONS (Web.dc.html) ── */
  if (compact) {
    const sect: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: TEXT2, letterSpacing: '0.06em', padding: '4px 4px 0' }
    const pick = (r: Recueil | 'all') => setRecueil(recueil === r ? 'all' : r)
    const lines: [Recueil | 'all', string, number][] = [['all', 'Toutes', ok.length], ...RECUEILS.map(r => [r.id, r.web, count(r.id)] as [Recueil, string, number])]
    return (
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 10px', borderRadius: 10, background: '#F2F2F7', flex: 'none' }}>
          <SearchIcon s={15} />
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher" aria-label="Rechercher"
            style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', fontSize: 14, outline: 'none', color: INK }} />
        </label>
        <span style={sect}>RECUEILS</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {lines.map(([id, label, n]) => {
            const on = recueil === id
            return (
              <button key={id} type="button" aria-pressed={on} onClick={() => id === 'all' ? setRecueil('all') : pick(id)} style={{
                display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, border: 'none', textAlign: 'left',
                color: INK, fontSize: 14, fontWeight: on ? 600 : 400, background: on ? '#F2F2F7' : 'transparent',
              }}><span>{label}</span><span style={{ color: TEXT2, fontWeight: on ? 500 : 400 }}>{n}</span></button>
            )
          })}
        </div>
        <span style={sect}>PARTITIONS</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {shown.map(e => (
            <button key={e.id} type="button" onClick={() => onOpen(e.text)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', textAlign: 'left', width: '100%',
              background: e.text === activeText ? '#FFF6E3' : 'transparent', color: INK,
            }}>
              <span style={{ width: 34, flex: 'none', fontSize: 13, fontWeight: 800, color: ACCENT }}>{e.key}</span>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 14, fontWeight: 600, ...ellipsis }}>{e.title}</span>
                <span style={{ fontSize: 12, color: TEXT2 }}>{e.meter}</span>
              </span>
            </button>
          ))}
          {!shown.length && <span style={{ padding: '18px 10px', fontSize: 13, color: TEXT2 }}>Aucune partition ne correspond.</span>}
        </div>
        <FixList bad={bad} onFix={fix} light />
        {sheets}
      </div>
    )
  }

  /* ── Phone held sideways: list + detail/add panel (BibliothequePaysage.dc.html) ── */
  if (landscape) {
    const cur = rows[Math.min(sel, Math.max(0, rows.length - 1))]
    const FILTERS: ['all' | 'ok' | 'fix', string][] = [['all', 'Tout'], ['ok', 'Répertoire'], ['fix', 'À corriger']]
    const ADDS: ['file' | 'scan' | 'paste' | 'new', string, string][] = [['file', 'Importer', 'fichier .msolfa'], ['scan', 'Scanner', 'photo ou PDF'], ['paste', 'Coller', 'texte solfa'], ['new', 'Créer', 'grille vide']]
    const HINT = { '': 'Choisis une façon d’ajouter.', file: 'Choisis un fichier .msolfa.', scan: 'Bientôt disponible.', paste: 'Colle du texte solfa.', new: 'Mesure, clé, tempo, puis la grille.' }
    const act = (k: typeof ADDS[number][0]) => {
      if (addKind === k) { setAddKind(''); return }
      setAddKind(k)
      if (k === 'file') fileRef.current?.click()
      if (k === 'paste') onFix({ name: 'nouvelle-partition', text: '' })
      if (k === 'new') setCreating(true)
    }
    const m = cur?.score?.metadata
    const btn: React.CSSProperties = { flex: 'none', width: 84, height: 44, borderRadius: 12, border: 'none', background: '#F2F2F7', color: INK, fontSize: 13, fontWeight: 600 }
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <input ref={fileRef} type="file" accept=".msolfa,.txt" hidden onChange={e => {
          const f = e.target.files?.[0]
          if (f) f.text().then(t => importFile(f.name.replace(/\.[^.]+$/, ''), t))
          e.target.value = ''
        }} />
        <header style={{ flex: 'none', height: 50, padding: '0 12px 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1 style={{ margin: 0, flex: 'none', fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>Bibliothèque</h1>
          <label style={{ flex: 1, minWidth: 0, height: 40, borderRadius: 12, background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
            <SearchIcon s={16} w={2.2} />
            <input type="text" value={q} onChange={e => { setQ(e.target.value); setSel(0) }} placeholder="Titre, numéro, compositeur" aria-label="Rechercher"
              style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: INK }} />
          </label>
          <div role="radiogroup" aria-label="Filtre" style={{ flex: 'none', display: 'flex', gap: 2, padding: 2, borderRadius: 10, background: '#E8E8ED' }}>
            {FILTERS.map(([id, label]) => {
              const on = filter === id
              return <button key={id} type="button" role="radio" aria-checked={on} onClick={() => { setFilter(id); setSel(0) }} style={{
                height: 36, border: 'none', borderRadius: 8, padding: '0 12px', fontSize: 12.5, color: INK, fontWeight: on ? 700 : 500, background: on ? '#FFFFFF' : 'transparent', boxShadow: on ? '0 1px 2px rgba(0,0,0,0.12)' : 'none',
              }}>{label}</button>
            })}
          </div>
        </header>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 10, padding: '0 12px 10px' }}>
          <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', borderRadius: 16, background: '#FFFFFF', padding: '2px 0' }}>
            {rows.map((e, i) => {
              const on = e === cur, good = !!e.score && !e.draft
              return (
                <button key={e.id} type="button" aria-pressed={on} onClick={() => setSel(i)} onDoubleClick={() => good ? onOpen(e.text) : fix(e)} style={{
                  width: '100%', minHeight: 52, border: 'none', borderBottom: '1px solid #F2F2F7', padding: '0 12px', color: INK, display: 'flex', alignItems: 'center', gap: 8, background: on ? '#FFF6E3' : 'transparent',
                }}>
                  <span style={{ flex: 'none', width: 36, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: ACCENT, textAlign: 'left' }}>{e.num}</span>
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, ...ellipsis }}>{e.title}</span>
                    <span style={{ fontSize: 11.5, color: TEXT2, ...ellipsis }}>{e.composer || (good ? '' : 'brouillon')}</span>
                  </span>
                  <span style={{ flex: 'none', fontSize: 12, fontWeight: 600, color: '#3A3A3C' }}>{e.meter} · {e.key}</span>
                  <span style={{ flex: 'none', borderRadius: 8, padding: '3px 7px', fontSize: 10.5, fontWeight: 700, background: good ? '#E3F4EC' : '#FDE9E7', color: good ? '#0F6E56' : '#B3261E' }}>{good ? 'OK' : 'à corriger'}</span>
                </button>
              )
            })}
            {!rows.length && <p style={{ margin: 0, padding: '24px 16px', textAlign: 'center', fontSize: 13, color: TEXT2 }}>Aucune partition ne correspond.</p>}
          </div>
          <aside style={{ flex: 'none', width: 292, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <section style={{ flex: 'none', borderRadius: 16, background: '#FFFFFF', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em', ...ellipsis }}>{cur?.title ?? '—'}</span>
                <span style={{ fontSize: 12, color: TEXT2, ...ellipsis }}>{cur?.composer || ' '}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4 }}>
                {[[cur?.meter ?? '—', 'mesure'], [m ? `do = ${m.key}` : '—', 'clé'], [m?.tempo ? `${m.tempo} BPM` : '—', 'tempo']].map(([v, k]) => (
                  <span key={k} style={{ height: 40, borderRadius: 10, background: '#F2F2F7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>{v}</span><span style={{ fontSize: 10.5, color: TEXT2 }}>{k}</span>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" disabled={!cur?.score} onClick={() => cur && onOpen(cur.text)} style={{
                  flex: 1, height: 44, borderRadius: 12, border: 'none', background: INK, color: '#FFFFFF', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: cur?.score ? 1 : 0.4,
                }}><svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>Écouter</button>
                <button type="button" disabled={!cur?.score} onClick={() => cur && (onRead ?? onOpen)(cur.text)} style={{ ...btn, opacity: cur?.score ? 1 : 0.4 }}>Lire</button>
                <button type="button" disabled={!cur} onClick={() => cur && fix(cur)} style={btn}>Modifier</button>
              </div>
            </section>
            <section aria-label="Ajouter une partition" style={{ flex: 1, minHeight: 0, borderRadius: 16, background: '#FFFFFF', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: TEXT2, letterSpacing: '0.06em' }}>AJOUTER UNE PARTITION</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
                {ADDS.map(([k, label, sub]) => {
                  const on = addKind === k
                  return (
                    <button key={k} type="button" aria-pressed={on} onClick={() => act(k)} style={{
                      height: 48, border: 'none', borderRadius: 12, padding: '0 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      background: on ? INK : '#F2F2F7', color: on ? '#FFFFFF' : INK,
                    }}><span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span><span style={{ fontSize: 11, opacity: 0.7 }}>{sub}</span></button>
                  )
                })}
              </div>
              <span style={{ fontSize: 11.5, color: TEXT2 }}>{HINT[addKind]}</span>
            </section>
          </aside>
        </div>
        {sheets}
      </div>
    )
  }

  /* ── Phone portrait (Main.dc.html) ── */
  const list = shown
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'max(58px, calc(env(safe-area-inset-top) + 14px)) 20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: ACCENT }}>Antema Fi</div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em' }}>Bibliothèque</h1>
        </div>
        <button type="button" aria-label="Ajouter une partition" aria-haspopup="menu" aria-expanded={!!adding} onClick={e => setAdding(e.currentTarget.getBoundingClientRect())}
          style={{ width: 44, height: 44, borderRadius: 22, border: 'none', background: INK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>

      <label style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 12px', borderRadius: 12, background: '#E8E8ED' }}>
        <SearchIcon />
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Titre, compositeur, numéro…" aria-label="Rechercher"
          style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', fontSize: 16, color: INK, outline: 'none' }} />
      </label>

      <div style={{ flex: 'none' }}><Seg items={TABS} value={tab} onPick={t => { setTab(t); setRecueil('all') }} label="Affichage" /></div>

      {tab === 'recueils' && (
        <div style={{ flex: 'none', display: 'flex', gap: 10 }}>
          {RECUEILS.map((r, i) => {
            const on = recueil === r.id, dark = i === 0
            return (
              <button key={r.id} type="button" aria-pressed={on} onClick={() => setRecueil(on ? 'all' : r.id)} style={{
                flex: 1, minWidth: 0, borderRadius: 16, padding: 14, border: on ? `2px solid ${ACCENT}` : '2px solid transparent', textAlign: 'left',
                background: dark ? INK : '#FFFFFF', color: dark ? '#FFFFFF' : INK, display: 'flex', flexDirection: 'column', gap: 18,
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: dark ? GOLD : ACCENT, letterSpacing: '0.04em' }}>{r.kicker}</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 17, fontWeight: 700 }}>{r.label}</span>
                  <span style={{ fontSize: 12, color: dark ? '#C7C7CC' : TEXT2 }}>{count(r.id)} partition{count(r.id) > 1 ? 's' : ''}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div style={{ flex: 'none', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{tab === 'programme' ? 'Mes partitions' : recueil !== 'all' ? RECUEILS.find(r => r.id === recueil)!.label : 'Toutes les partitions'}</h2>
        <span style={{ fontSize: 13, color: TEXT2 }}>{list.length} prête{list.length > 1 ? 's' : ''}</span>
      </div>

      <div style={{ flex: 'none', background: '#FFFFFF', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {list.map(e => (
          <button key={e.id} type="button" onClick={() => onOpen(e.text)} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', color: INK, border: 'none', borderBottom: `1px solid ${SEP}`, textAlign: 'left', width: '100%',
            background: e.text === activeText ? '#FFF6E3' : 'transparent',
          }}>
            <span style={{ flex: 'none', width: 44, height: 44, borderRadius: 10, background: '#F5F5F7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: ACCENT, lineHeight: 1 }}>{e.key}</span>
              <span style={{ fontSize: 10, color: TEXT2, marginTop: 3 }}>{e.meter}</span>
            </span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 600, ...ellipsis }}>{e.num !== '—' ? `${e.num} · ` : ''}{e.title}</span>
              <span style={{ fontSize: 12, color: TEXT2, ...ellipsis }}>{e.sub || ' '}</span>
            </span>
            <Chevron />
          </button>
        ))}
        {!list.length && (
          <p style={{ margin: 0, padding: '28px 16px', textAlign: 'center', fontSize: 14, color: TEXT2 }}>
            {tab === 'programme' && !q ? 'Les partitions ajoutées sur cet appareil apparaissent ici.' : `Aucune partition ne correspond${q ? ` à « ${q} »` : ''}.`}
          </p>
        )}
      </div>
      <FixList bad={bad} onFix={fix} />
      {sheets}
    </div>
  )
}

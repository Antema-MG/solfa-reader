import { useMemo, useRef, useState } from 'react'
import { Icon } from '../Shell/Icon'
import { diagnose, fixAll } from '../../domain/diagnose'
import { parseMsolfa } from '../../domain/parser'
import { pill } from '../Shell/ui'

export interface Draft { id?: string; name: string; text: string; origin?: string }

const KEYS = ['d', 'r', 'm', 'f', 's', 'l', 't']
const MODS: { t: string; label: string }[] = [
  { t: "'", label: 'Octave haute' }, { t: ',', label: 'Octave basse' }, { t: 'i', label: 'Dièse' }, { t: 'a', label: 'Bémol' },
  { t: '-', label: 'Tenir' }, { t: '0', label: 'Silence' }, { t: '.', label: 'Deux croches' }, { t: ' : ', label: 'Séparer un temps' }, { t: ' | ', label: 'Barre de mesure' },
]

/**
 * Text editor with live validation: lists what is wrong, offers one-tap fixes,
 * and only lets the score into the library once the parser accepts it.
 */
export default function GuidedEditor({ draft, onCancel, onSave }: {
  draft: Draft
  onCancel: () => void
  onSave: (d: Draft, text: string) => void
}) {
  const [text, setText] = useState(draft.text)
  const [undo, setUndo] = useState<string[]>([])
  const area = useRef<HTMLTextAreaElement>(null)

  const issues = useMemo(() => diagnose(text), [text])
  const parsed = useMemo(() => parseMsolfa(text), [text])
  const valid = parsed.success
  const hasFixes = issues.some(i => i.fix)
  const title = parsed.success ? parsed.file.metadata.title : (text.match(/^Titre:\s*(.*)$/m)?.[1] ?? draft.name)

  const change = (next: string) => { if (next !== text) { setUndo(u => [...u.slice(-30), text]); setText(next) } }
  const jump = (line: number) => {
    const el = area.current; if (!el) return
    const start = text.split('\n').slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0)
    el.focus(); el.setSelectionRange(start, start + (text.split('\n')[line - 1]?.length ?? 0))
    el.scrollTop = Math.max(0, (line - 3) * 20)
  }
  const insert = (s: string) => {
    const el = area.current; if (!el) return
    const a = el.selectionStart, b = el.selectionEnd
    change(text.slice(0, a) + s + text.slice(b))
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + s.length, a + s.length) })
  }
  const key: React.CSSProperties = {
    height: 44, border: 'none', borderRadius: 8, background: 'var(--bg2)', boxShadow: '0 1px 0 rgba(0,0,0,.25)',
    fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--text)',
  }

  return (
    <>
      <header style={{ flex: 'none', padding: '10px 12px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <button type="button" onClick={onCancel} style={{ minHeight: 44, marginLeft: -6, padding: 0, border: 'none', background: 'transparent', color: 'var(--accent-ink)', fontSize: 16, display: 'inline-flex', alignItems: 'center' }}><Icon name="chevronLeft" size={26} />Retour</button>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title || 'Nouvelle partition'}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)' }}>Éditeur guidé</div>
        </div>
        <button type="button" onClick={() => { const u = undo[undo.length - 1]; if (u != null) { setText(u); setUndo(x => x.slice(0, -1)) } }}
          disabled={!undo.length} aria-label="Annuler" style={{ width: 44, height: 44, border: 'none', background: 'transparent', color: 'var(--text)', opacity: undo.length ? 1 : 0.3 }}><Icon name="undo" /></button>
      </header>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <section aria-live="polite" style={{ background: 'var(--bg2)', borderRadius: 16, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 }}>
            <b style={{ fontSize: 14, color: valid ? 'var(--green2)' : 'var(--s)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {valid ? <><Icon name="checkCircle" size={16} />Partition valide</> : issues.length ? `${issues.length} point${issues.length > 1 ? 's' : ''} à corriger` : 'Partition à vérifier'}
            </b>
            {hasFixes && <button type="button" onClick={() => change(fixAll(text))} style={{ ...pill(false, 32), background: 'var(--bg3)', color: 'var(--text)', border: 'none' }}>Tout corriger</button>}
          </div>
          {!valid && !issues.length && !parsed.success && parsed.errors.map((e, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text2)', padding: '4px 0', borderTop: '1px solid var(--border)' }}>{e.line ? `L${e.line} · ` : ''}{e.message}</div>
          ))}
          {issues.slice(0, 12).map(i => (
            <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid var(--border)' }}>
              <span style={{ flex: 'none', width: 8, height: 8, borderRadius: 4, background: 'var(--s)' }} />
              <button type="button" onClick={() => jump(i.line)} style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', textAlign: 'left', padding: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{i.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{i.hint}</div>
              </button>
              {i.fix && <button type="button" onClick={() => change(i.fix!(text))} style={{ ...pill(true, 34), flex: 'none', fontSize: 12 }}>{i.fixLabel}</button>}
            </div>
          ))}
          {issues.length > 12 && <div style={{ fontSize: 12, color: 'var(--text2)', paddingTop: 4 }}>… et {issues.length - 12} autres</div>}
        </section>

        <textarea ref={area} value={text} onChange={e => change(e.target.value)} spellCheck={false} aria-label="Texte de la partition"
          style={{
            flex: 'none', minHeight: 260, width: '100%', resize: 'vertical', border: '1px solid var(--border2)', borderRadius: 12, padding: 12,
            background: 'var(--bg2)', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 12, lineHeight: '20px', whiteSpace: 'pre', overflowX: 'auto',
          }} />

        <button type="button" disabled={!valid} onClick={() => onSave(draft, text)} style={{
          flex: 'none', height: 48, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 700, marginBottom: 8,
          background: valid ? 'var(--green)' : 'var(--bg4)', color: valid ? '#fff' : 'var(--text2)',
        }}>{valid ? 'Valider et ajouter à la bibliothèque' : 'Corriger avant de valider'}</button>
      </div>

      <section aria-label="Clavier solfa" style={{ flex: 'none', padding: '8px 6px 8px', background: 'var(--bg4)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 5 }}>
          {KEYS.map(k => <button key={k} type="button" onClick={() => insert(k)} style={key}>{k}</button>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, minmax(0, 1fr))', gap: 5 }}>
          {MODS.map(m => <button key={m.label} type="button" aria-label={m.label} title={m.label} onClick={() => insert(m.t)} style={{ ...key, fontSize: 15 }}>{m.t.trim() || m.t}</button>)}
        </div>
      </section>
    </>
  )
}

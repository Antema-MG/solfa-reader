import { Icon } from '../Shell/Icon'
import { useEditor } from '../../state/EditorContext'
import { cellAt, slotCount, type Rhythm } from '../../domain/editOps'
import { ACCENT, INK } from '../Shell/controls'

const DEGREES = ['d', 'r', 'm', 'f', 's', 'l', 't']
const RHYTHMS: { value: Rhythm; label: string; hint: string; key: string }[] = [
  { value: 'note',   label: '♩',    hint: '1 note (1)',        key: '1' },
  { value: 'pair',   label: '♪♪',   hint: '2 croches (2)',     key: '2' },
  { value: 'triple', label: '♪³',   hint: '3 croches (3)',     key: '3' },
  { value: 'quad',   label: '♪⁴',   hint: '4 croches (4)',     key: '4' },
  { value: 'tie',    label: '–',    hint: 'tenue (5)',         key: '5' },
  { value: 'rest',   label: '0',    hint: 'silence (6)',       key: '6' },
]

const chip = (on: boolean): React.CSSProperties => ({
  flex: 'none', minWidth: 36, height: 34, padding: '0 8px', border: 'none', borderRadius: 17,
  background: on ? INK : '#F5F5F7', color: on ? '#fff' : INK, fontSize: 15, fontWeight: 700,
})
const sep: React.CSSProperties = { flex: 'none', width: 1, height: 22, background: '#E5E5EA', margin: '0 2px' }

/** One compact, scrollable line under the score: rhythm · degree · ♯♭ · octave · Terminer. */
export default function RhythmToolbar() {
  const { model, selection, apply, exit } = useEditor()
  const cell = model && selection ? cellAt(model, selection) : undefined
  const slot = selection?.slot ?? 0
  const cur = cell?.kind === 'tuple' ? cell.slots[slot] : cell
  const note = cur?.kind === 'note' ? cur : null
  const n = slotCount(cell)
  const active: Rhythm | null = !cell ? null : cell.kind === 'tuple' ? (n === 2 ? 'pair' : n === 3 ? 'triple' : 'quad') : cell.kind

  return (
    <div style={{
      flex: 'none', background: '#FFFFFF', borderTop: '1px solid #E5E5EA', padding: '8px 10px calc(env(safe-area-inset-bottom) + 8px)',
      display: 'flex', gap: 8, alignItems: 'center',
    }}>
    <div role="toolbar" aria-label="Édition" style={{ flex: 1, minWidth: 0, display: 'flex', gap: 6, alignItems: 'center', overflowX: 'auto' }}>
      {RHYTHMS.map(r => (
        <button key={r.value} type="button" title={r.hint} aria-label={r.hint} style={chip(active === r.value)}
          onClick={() => apply({ type: 'rhythm', value: r.value })}>{r.label}</button>
      ))}
      <span style={sep} />
      {DEGREES.map(d => (
        <button key={d} type="button" style={{ ...chip(note?.degree === d), fontFamily: 'var(--mono)' }}
          onClick={() => apply({ type: 'degree', value: d })}>{d}</button>
      ))}
      <span style={sep} />
      <button type="button" title="Dièse (+)" aria-label="Dièse" style={chip(note?.chromatic === 1)} onClick={() => apply({ type: 'accidental', value: 'sharp' })}>♯</button>
      <button type="button" title="Bémol (-)" aria-label="Bémol" style={chip(note?.chromatic === -1)} onClick={() => apply({ type: 'accidental', value: 'flat' })}>♭</button>
      <button type="button" title="Octave +" aria-label="Octave plus" style={chip(false)} onClick={() => apply({ type: 'octave', value: 1 })}><Icon name="arrowUp" size={16} /></button>
      <button type="button" title="Octave −" aria-label="Octave moins" style={chip(false)} onClick={() => apply({ type: 'octave', value: -1 })}><Icon name="arrowDown" size={16} /></button>
    </div>
    <button type="button" onClick={exit} style={{ ...chip(false), background: ACCENT, color: '#fff', padding: '0 14px', fontSize: 13 }}>Terminer</button>
    </div>
  )
}

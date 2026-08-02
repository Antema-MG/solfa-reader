import type { EditCell } from '../../types'
import { useEditor } from '../../state/EditorContext'

const DEGREES = ['d', 'r', 'm', 'f', 's', 'l', 't']
const RHYTHMS: { value: 'note' | 'pair' | 'tie' | 'rest'; label: string; hint: string }[] = [
  { value: 'note', label: '♩',  hint: '1 note' },
  { value: 'pair', label: '♪♪', hint: '2 croches' },
  { value: 'tie',  label: '–',  hint: 'tenue' },
  { value: 'rest', label: '0',  hint: 'silence' },
]

function chipStyle(active: boolean): React.CSSProperties {
  return {
    minWidth: 34, height: 32, borderRadius: 6, fontSize: 14,
    border: active ? '1px solid var(--accent)' : '1px solid var(--border2)',
    background: active ? 'var(--accent)' : 'var(--bg4)',
    color: active ? '#1a1a1a' : 'var(--text)',
    fontWeight: 600, cursor: 'pointer',
  }
}

export default function RhythmToolbar() {
  const { model, selection, apply, exit, save } = useEditor()

  const cell: EditCell | undefined =
    model && selection
      ? model.blocks[selection.block]?.measures[selection.measure]?.beats[selection.voice]?.[selection.beat]
      : undefined

  const rhythm = cell?.kind ?? null
  const activeNote =
    cell?.kind === 'note' ? cell
    : cell?.kind === 'pair' ? (selection?.slot === 'b' ? cell.b : cell.a.kind === 'note' ? cell.a : null)
    : null
  const degree = activeNote?.degree ?? null

  const sep: React.CSSProperties = { width: 1, height: 26, background: 'var(--border2)', margin: '0 4px' }

  return (
    <div style={{
      flex: 'none', background: 'var(--bg2)', borderTop: '1px solid var(--border)',
      padding: '8px 16px', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 2 }}>Rythme</span>
      {RHYTHMS.map(r => (
        <button key={r.value} title={r.hint} style={chipStyle(rhythm === r.value)}
          onClick={() => apply({ type: 'rhythm', value: r.value })}>{r.label}</button>
      ))}

      <span style={sep} />

      <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 2 }}>Note</span>
      {DEGREES.map(d => (
        <button key={d} style={chipStyle(degree === d)}
          onClick={() => apply({ type: 'degree', value: d })}>{d}</button>
      ))}

      <span style={sep} />

      <button title="Dièse" style={chipStyle(activeNote?.chromatic === 1)}
        onClick={() => apply({ type: 'accidental', value: 'sharp' })}>♯</button>
      <button title="Bémol" style={chipStyle(activeNote?.chromatic === -1)}
        onClick={() => apply({ type: 'accidental', value: 'flat' })}>♭</button>
      <button title="Octave +" style={chipStyle(false)}
        onClick={() => apply({ type: 'octave', value: 1 })}>↑</button>
      <button title="Octave −" style={chipStyle(false)}
        onClick={() => apply({ type: 'octave', value: -1 })}>↓</button>

      <span style={{ flex: 1 }} />

      <button onClick={save} style={{
        height: 32, padding: '0 12px', borderRadius: 6, fontSize: 13, fontWeight: 600,
        border: '1px solid var(--accent)', background: 'var(--accent)', color: '#1a1a1a', cursor: 'pointer',
      }}>Enregistrer .msolfa</button>
      <button onClick={exit} style={{
        height: 32, padding: '0 12px', borderRadius: 6, fontSize: 13,
        border: '1px solid var(--border2)', background: 'var(--bg4)', color: 'var(--text)', cursor: 'pointer',
      }}>Terminer</button>
    </div>
  )
}

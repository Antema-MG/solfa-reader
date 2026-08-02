import { useRef, useEffect } from 'react'
import type { Voice, EditCell, EditSlot, EditNote } from '../../types'
import { useEditor } from '../../state/EditorContext'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']
const VOICE_VAR: Record<Voice, string> = { S: '--s', A: '--a', T: '--t', B: '--b' }

function noteText(n: EditNote): string {
  return n.degree + (n.chromatic === 1 ? 'i' : n.chromatic === -1 ? 'a' : '') + n.octave
}
function slotText(s: EditSlot): string {
  return s.kind === 'note' ? noteText(s) : s.kind === 'tie' ? '–' : '·'
}

export default function EditorGrid() {
  const { model, selection, select } = useEditor()
  const wrapRef = useRef<HTMLDivElement>(null)

  // Keep the selected cell in view as the user navigates.
  useEffect(() => {
    wrapRef.current?.querySelector<HTMLElement>('[data-selected="1"]')
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selection])

  if (!model) return null

  const isSel = (b: number, v: Voice, m: number, j: number, slot: 'a' | 'b' | null) =>
    !!selection && selection.block === b && selection.voice === v &&
    selection.measure === m && selection.beat === j &&
    (slot === null || selection.slot === slot)

  const cellBox = (text: string, selected: boolean, varName: string, onClick: () => void, key?: string) => (
    <span
      key={key}
      data-selected={selected ? '1' : undefined}
      onClick={onClick}
      style={{
        display: 'inline-block', minWidth: 20, textAlign: 'center',
        padding: '3px 5px', borderRadius: 4, cursor: 'pointer',
        background: selected ? `var(${varName})` : 'var(--bg3, rgba(255,255,255,0.04))',
        color: selected ? '#111' : 'var(--text2)',
        fontWeight: selected ? 700 : undefined,
        outline: selected ? `1px solid var(${varName})` : '1px solid var(--border)',
      }}
    >{text}</span>
  )

  const renderCell = (cell: EditCell, b: number, v: Voice, m: number, j: number) => {
    const varName = VOICE_VAR[v]
    if (cell.kind === 'pair') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
          {cellBox(slotText(cell.a), isSel(b, v, m, j, 'a'), varName, () => select({ block: b, voice: v, measure: m, beat: j, slot: 'a' }), 'a')}
          <span style={{ color: 'var(--text3)', fontSize: 10 }}>·</span>
          {cellBox(slotText(cell.b), isSel(b, v, m, j, 'b'), varName, () => select({ block: b, voice: v, measure: m, beat: j, slot: 'b' }), 'b')}
        </span>
      )
    }
    const text = cell.kind === 'note' ? noteText(cell) : cell.kind === 'tie' ? '–' : '·'
    return cellBox(text, isSel(b, v, m, j, null), varName, () => select({ block: b, voice: v, measure: m, beat: j, slot: null }))
  }

  return (
    <div ref={wrapRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', background: 'var(--bg)' }}>
      {model.blocks.map((block, bi) => (
        <div key={bi} style={{ marginBottom: 20 }}>
          {block.comment && (
            <div style={{ color: 'var(--text3)', fontSize: 12, fontFamily: 'var(--mono)', marginBottom: 6, letterSpacing: '.03em' }}>
              {block.comment}
            </div>
          )}
          {VOICES.map(v => (
            <div key={v} style={{ display: 'flex', alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 13, marginBottom: 5 }}>
              <span style={{ width: 26, flex: 'none', fontWeight: 700, color: `var(${VOICE_VAR[v]})` }}>{v}.</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <span style={{ color: 'var(--text3)', padding: '0 4px', fontWeight: 300 }}>||</span>
                {block.measures.map((measure, mi) => (
                  <span key={mi} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    {measure.beats[v].map((cell, j) => (
                      <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        {j > 0 && <span style={{ color: 'var(--text3)' }}>:</span>}
                        {renderCell(cell, bi, v, mi, j)}
                      </span>
                    ))}
                    <span style={{ color: 'var(--text3)', padding: '0 4px', fontWeight: 300 }}>
                      {mi < block.measures.length - 1 ? '|' : '||'}
                    </span>
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

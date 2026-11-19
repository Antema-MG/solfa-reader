import { useRef, useEffect, useState } from 'react'
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
  const [width, setWidth] = useState(360)

  // Lines of measures follow the available width (like the score view).
  useEffect(() => {
    const el = wrapRef.current; if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el); setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [model == null])

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

  // One CSS grid per line of measures: every beat is a column shared by S/A/T/B, so a
  // two-eighths cell (« d.r ») widens its column for all voices and the | bars stay aligned.
  const num = model.numerator
  const perLine = Math.max(1, Math.floor((width - 60) / (num * 46 + 16)))
  const sep: React.CSSProperties = { color: 'var(--text3)', fontWeight: 300, textAlign: 'center' }

  return (
    <div ref={wrapRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', background: 'var(--bg)' }}>
      {model.blocks.map((block, bi) => (
        <div key={bi} style={{ marginBottom: 20 }}>
          {block.comment && (
            <div style={{ color: 'var(--text3)', fontSize: 12, fontFamily: 'var(--mono)', marginBottom: 6, letterSpacing: '.03em' }}>
              {block.comment}
            </div>
          )}
          {Array.from({ length: Math.ceil(block.measures.length / perLine) }, (_, li) => {
            const first = li * perLine
            const ms = block.measures.slice(first, first + perLine)
            const last = first + ms.length === block.measures.length
            // label · opening bar · per measure: cell (: cell)* then its bar
            const cols = ['26px', '14px', ...ms.flatMap(() => [...Array.from({ length: num }, (_, j) => j ? ['8px', 'auto'] : ['auto']).flat(), '16px'])].join(' ')
            return (
              <div key={li} style={{
                display: 'grid', gridTemplateColumns: cols, justifyContent: 'start', alignItems: 'center',
                rowGap: 5, fontFamily: 'var(--mono)', fontSize: 13, marginBottom: 8,
              }}>
                {VOICES.map(v => [
                  <span key={`${v}l`} style={{ fontWeight: 700, color: `var(${VOICE_VAR[v]})` }}>{v}.</span>,
                  <span key={`${v}o`} style={sep}>{li === 0 ? '||' : '|'}</span>,
                  ...ms.flatMap((measure, k) => {
                    const mi = first + k
                    return [
                      ...measure.beats[v].flatMap((cell, j) => [
                        ...(j ? [<span key={`${v}${mi}c${j}`} style={sep}>:</span>] : []),
                        <span key={`${v}${mi}-${j}`} style={{ justifySelf: 'center' }}>{renderCell(cell, bi, v, mi, j)}</span>,
                      ]),
                      <span key={`${v}${mi}b`} style={sep}>{last && k === ms.length - 1 ? '||' : '|'}</span>,
                    ]
                  }),
                ])}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

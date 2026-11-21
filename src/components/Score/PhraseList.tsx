import { useEffect, useRef, useState } from 'react'
import type { Voice } from '../../types'
import { usePlayer } from '../../state/PlayerContext'
import { usePrefs } from '../../state/PrefsContext'
import { useEditor } from '../../state/EditorContext'
import { isValidToken } from '../../domain/parser'
import { slotToken } from '../../domain/serialize'

const ALL: Voice[] = ['S', 'A', 'T', 'B']
const COLOR: Record<Voice, string> = { S: 'var(--s)', A: 'var(--a)', T: 'var(--t)', B: 'var(--b)' }
const FONT = [12, 14, 17]
const SEL = '#85632A'

type Pos = { bi: number; v: Voice; mi: number; j: number }
const same = (a: Pos | null, b: Pos) => !!a && a.bi === b.bi && a.v === b.v && a.mi === b.mi && a.j === b.j

/**
 * Every phrase of the score, one card each, all visible (no accordion).
 * Voices shown / zoom / font size / lyrics come from the shared prefs.
 * `editable`: same view, but a tap selects a beat, a double tap types it in place
 * (e.g. `m.m.m`), ↵ starts a new line (phrase) at a bar and ⤶ joins it back.
 */
export default function PhraseList({ dense = false, editable = false }: { dense?: boolean; editable?: boolean }) {
  const { score, currentBeat, status, seekTo, solo, muted } = usePlayer()
  const { myVoice, zoom, fontSize, lyrics, big, shown: shownPref } = usePrefs()
  const { model, selection, select, apply, split, merge } = useEditor()
  const edit = editable && !!model
  const wrap = useRef<HTMLDivElement>(null)
  const activeBi = Math.floor(currentBeat)
  const [width, setWidth] = useState(360)
  const [typing, setTyping] = useState<Pos | null>(null)
  const [bad, setBad] = useState(false)

  // Fit as many measures per row as the screen allows (up to 6).
  useEffect(() => {
    const el = wrap.current; if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el); setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [score])

  // Keep the playing beat in view.
  useEffect(() => {
    if (status !== 'playing' || !wrap.current) return
    wrap.current.querySelector<HTMLElement>(`[data-bi="${activeBi}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeBi, status])

  // Leaving edit mode closes any open input.
  useEffect(() => { if (!edit) setTyping(null) }, [edit])

  if (!score) return null
  const bpm = score.beatsPerMeasure
  const cell = 34 + FONT[fontSize] * (zoom / 100) * 0.5 + (edit ? 10 : 0)   // min px per beat so notes stay readable
  const perRow = Math.max(1, Math.min(6, Math.floor((width - 24 - 20 - 20) / (bpm * (dense ? cell - 4 : cell)))))
  const fs = FONT[fontSize] * (zoom / 100)
  const shown = edit ? ALL : ALL.filter(v => shownPref[v])
  const fv = (v: Voice) => fs * (dense && big && !edit ? (v === myVoice ? 1.15 : 0.85) : 1)
  const audible = (v: Voice) => (solo.size ? solo.has(v) : !muted[v])

  const isSel = (p: Pos) => edit && !!selection && selection.block === p.bi && selection.voice === p.v && selection.measure === p.mi && selection.beat === p.j
  const commit = (p: Pos, value: string) => {
    if (!isValidToken(value)) { setBad(true); return false }
    select({ block: p.bi, voice: p.v, measure: p.mi, beat: p.j, slot: null })
    apply({ type: 'setToken', value }); setTyping(null); setBad(false)
    return true
  }

  return (
    <div ref={wrap} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: dense ? '6px 8px 10px' : '12px 12px 16px', display: 'flex', flexDirection: 'column', gap: dense ? 6 : 10 }}>
      {score.renderBlocks.map((block, bi) => {
        const rows: typeof block.measures[] = []
        for (let i = 0; i < block.measures.length; i += perRow) rows.push(block.measures.slice(i, i + perRow))
        const first = block.measures[0].index + 1, last = block.measures[block.measures.length - 1].index + 1
        return (
          <section key={bi} style={{ flex: 'none', background: 'var(--bg2)', borderRadius: dense ? 12 : 18, padding: dense ? '4px 8px 6px' : '10px 10px 12px', display: 'flex', flexDirection: 'column', gap: dense ? 4 : 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 2px' }}>
              <span style={{ fontSize: dense ? 10.5 : 12, fontWeight: 700, color: 'var(--text2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Phrase {bi + 1}
              </span>
              <span style={{ fontSize: dense ? 10 : 11, color: 'var(--text2)', display: 'inline-flex', gap: 10, alignItems: 'baseline' }}>
                {edit && bi > 0 && (
                  <button type="button" onClick={() => merge(bi - 1)} title="Joindre à la phrase précédente"
                    style={{ border: 'none', background: '#F5F5F7', color: SEL, borderRadius: 10, height: 22, padding: '0 9px', fontSize: 11, fontWeight: 700 }}>⤶ joindre</button>
                )}
                mes. {first}–{last}
              </span>
            </div>
            {rows.map((ms, ri) => {
              const cols = `20px repeat(${ms.length * bpm}, minmax(0, 1fr))`
              return (
                <div key={ri} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {shown.map((v, vi) => (
                    <div key={v} style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', fontFamily: 'var(--mono)', fontSize: fv(v), opacity: audible(v) ? 1 : 0.35 }}>
                      <span style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 800, color: COLOR[v] }}>{v}</span>
                      {ms.flatMap((m, mi) => Array.from({ length: bpm }, (_, j) => {
                        const beat = m.beats[v][j], bi2 = m.startBeat + j
                        const gi = ri * perRow + mi                       // measure index inside the phrase
                        const pos: Pos = { bi, v, mi: gi, j }
                        const cur = Math.floor(activeBi / bpm) === m.index
                        const now = status === 'playing' && bi2 === activeBi
                        const sel = isSel(pos)
                        const raw = beat?.raw ?? ''
                        const h = fv(v) * (dense ? 1.55 : 1.9)
                        const open = edit && same(typing, pos)
                        const mc = model?.blocks[bi]?.measures[gi]?.beats[v][j]
                        return (
                          <span key={`${mi}-${j}`} data-bi={bi2} data-voice={v}
                            onClick={() => edit ? select({ block: bi, voice: v, measure: gi, beat: j, slot: null }) : seekTo(bi2)}
                            onDoubleClick={edit ? () => { setBad(false); setTyping(pos) } : undefined}
                            style={{
                              position: 'relative', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden',
                              height: h, lineHeight: `${h}px`,
                              fontSize: !open && raw.length > 5 ? fv(v) * 0.82 : undefined,
                              borderLeft: j === 0 && (mi > 0 || false) ? '1px solid var(--border2)' : undefined,
                              background: sel ? '#85632A1F' : now ? `var(--${v.toLowerCase()}-bg)` : cur ? 'var(--cur)' : undefined,
                              boxShadow: sel ? `inset 0 0 0 1.5px ${SEL}` : undefined, borderRadius: sel ? 6 : undefined,
                              color: v === myVoice || now ? COLOR[v] : '#3A3A3C',
                              fontWeight: v === myVoice || now ? 700 : 500,
                            }}>
                            {j > 0 && <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, color: '#C7C7CC', fontWeight: 400, fontSize: '0.85em', pointerEvents: 'none' }}>:</span>}
                            {open
                              ? <input autoFocus defaultValue={raw} aria-label="Temps" spellCheck={false} autoCapitalize="off" autoCorrect="off"
                                  onFocus={e => e.currentTarget.select()}
                                  onChange={() => setBad(false)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') { e.preventDefault(); if (commit(pos, e.currentTarget.value)) e.currentTarget.dataset.done = '1' }
                                    else if (e.key === 'Escape') { e.preventDefault(); e.currentTarget.dataset.done = '1'; setTyping(null); setBad(false) }
                                  }}
                                  onBlur={e => { if (e.currentTarget.dataset.done) return; if (!commit(pos, e.currentTarget.value)) { setTyping(null); setBad(false) } }}
                                  style={{ width: '100%', height: '100%', boxSizing: 'border-box', padding: 0, margin: 0, textAlign: 'center', font: 'inherit', fontSize: fv(v), border: 'none', outline: `2px solid ${bad ? '#FF3B30' : SEL}`, borderRadius: 6, background: '#fff', color: '#1D1D1F' }} />
                              : edit && sel && mc?.kind === 'tuple'
                                ? mc.slots.map((s, k) => (
                                    <span key={k}>{k > 0 && '.'}<span style={{ textDecoration: selection?.slot === k ? 'underline' : undefined, color: selection?.slot === k ? SEL : undefined }}>{slotToken(s)}</span></span>
                                  ))
                                : raw}
                            {edit && vi === 0 && j === 0 && gi > 0 && (
                              <button type="button" aria-label="Nouvelle ligne ici" title="Nouvelle ligne (phrase) ici"
                                onClick={e => { e.stopPropagation(); split(bi, gi) }}
                                style={{ position: 'absolute', left: 1, bottom: 0, width: 16, height: 16, lineHeight: '14px', padding: 0, border: 'none', borderRadius: 8, background: '#F5F5F7', color: SEL, fontSize: 11, fontWeight: 800 }}>↵</button>
                            )}
                          </span>
                        )
                      }))}
                    </div>
                  ))}
                  {lyrics && (
                    <div style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', borderTop: '1px dashed #E5E5EA', marginTop: 2 }}>
                      <span />
                      {ms.flatMap((m, mi) => Array.from({ length: bpm }, (_, j) => {
                        const cur = Math.floor(activeBi / bpm) === m.index
                        return (
                          <span key={`${mi}-${j}`} style={{
                            textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            fontSize: Math.max(11, fs * 0.86), fontWeight: 600, height: fs * (dense ? 1.4 : 1.7), lineHeight: `${fs * (dense ? 1.4 : 1.7)}px`,
                            borderLeft: j === 0 && mi > 0 ? '1px solid var(--border2)' : undefined,
                            background: cur ? 'var(--cur)' : undefined, color: '#3A3A3C',
                          }}>{m.beats.S[j]?.lyric ?? ''}</span>
                        )
                      }))}
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}

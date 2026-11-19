import { useEffect, useRef, useState } from 'react'
import type { Voice } from '../../types'
import { usePlayer } from '../../state/PlayerContext'
import { usePrefs } from '../../state/PrefsContext'

const ALL: Voice[] = ['S', 'A', 'T', 'B']
const COLOR: Record<Voice, string> = { S: 'var(--s)', A: 'var(--a)', T: 'var(--t)', B: 'var(--b)' }
const FONT = [12, 14, 17]

/**
 * Every phrase of the score, one card each, all visible (no accordion).
 * Voices shown / zoom / font size / lyrics come from the shared prefs.
 */
export default function PhraseList({ dense = false }: { dense?: boolean }) {
  const { score, currentBeat, status, seekTo, solo, muted } = usePlayer()
  const { myVoice, zoom, fontSize, lyrics } = usePrefs()
  const wrap = useRef<HTMLDivElement>(null)
  const activeBi = Math.floor(currentBeat)
  const [width, setWidth] = useState(360)

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

  if (!score) return null
  const bpm = score.beatsPerMeasure
  const cell = 34 + FONT[fontSize] * (zoom / 100) * 0.5            // min px per beat so notes stay readable
  const perRow = Math.max(1, Math.min(6, Math.floor((width - 24 - 20 - 20) / (bpm * (dense ? cell - 4 : cell)))))
  const fs = FONT[fontSize] * (zoom / 100)
  const shown = ALL
  const audible = (v: Voice) => (solo.size ? solo.has(v) : !muted[v])

  return (
    <div ref={wrap} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: dense ? '6px 8px 10px' : '12px 12px 16px', display: 'flex', flexDirection: 'column', gap: dense ? 6 : 10 }}>
      {score.renderBlocks.map((block, bi) => {
        const rows: typeof block.measures[] = []
        for (let i = 0; i < block.measures.length; i += perRow) rows.push(block.measures.slice(i, i + perRow))
        const first = block.measures[0].index + 1, last = block.measures[block.measures.length - 1].index + 1
        return (
          <section key={bi} style={{ flex: 'none', background: 'var(--bg2)', borderRadius: dense ? 12 : 18, padding: dense ? '4px 8px 6px' : '10px 10px 12px', display: 'flex', flexDirection: 'column', gap: dense ? 4 : 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 2px' }}>
              <span style={{ fontSize: dense ? 11 : 13, fontWeight: 600, color: 'var(--text2)' }}>
                Phrase {bi + 1}
              </span>
              <span style={{ fontSize: dense ? 10 : 11, color: 'var(--text2)' }}>mes. {first}–{last}</span>
            </div>
            {rows.map((ms, ri) => {
              const cols = `20px repeat(${ms.length * bpm}, minmax(0, 1fr))`
              return (
                <div key={ri} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {shown.map(v => (
                    <div key={v} style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', fontFamily: 'var(--mono)', fontSize: fs, opacity: audible(v) ? 1 : 0.35 }}>
                      <span style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 800, color: COLOR[v] }}>{v}</span>
                      {ms.flatMap((m, mi) => Array.from({ length: bpm }, (_, j) => {
                        const beat = m.beats[v][j], bi2 = m.startBeat + j
                        const cur = Math.floor(activeBi / bpm) === m.index
                        const now = bi2 === activeBi
                        return (
                          <span key={`${mi}-${j}`} data-bi={bi2} data-voice={v} onClick={() => seekTo(bi2)}
                            style={{
                              textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden',
                              height: fs * (dense ? 1.55 : 1.9), lineHeight: `${fs * (dense ? 1.55 : 1.9)}px`,
                              borderLeft: j === 0 && (mi > 0 || false) ? '1px solid var(--border2)' : undefined,
                              background: now ? `var(--${v.toLowerCase()}-bg)` : cur ? 'var(--cur)' : undefined,
                              color: v === myVoice || now ? COLOR[v] : 'var(--text2)',
                              fontWeight: v === myVoice || now ? 700 : 500,
                            }}>{beat?.raw ?? ''}</span>
                        )
                      }))}
                    </div>
                  ))}
                  {lyrics && (
                    <div style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', borderTop: '1px dashed var(--border2)', marginTop: 2 }}>
                      <span />
                      {ms.flatMap((m, mi) => Array.from({ length: bpm }, (_, j) => {
                        const cur = Math.floor(activeBi / bpm) === m.index
                        return (
                          <span key={`${mi}-${j}`} style={{
                            textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            fontSize: Math.max(11, fs * 0.85), fontWeight: 600, height: fs * (dense ? 1.4 : 1.7), lineHeight: `${fs * (dense ? 1.4 : 1.7)}px`,
                            borderLeft: j === 0 && mi > 0 ? '1px solid var(--border2)' : undefined,
                            background: cur ? 'var(--cur)' : undefined, color: 'var(--text)',
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

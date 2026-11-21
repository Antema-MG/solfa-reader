import { useEffect, useRef, useState } from 'react'
import type { Voice } from '../../types'
import { usePlayer } from '../../state/PlayerContext'
import { usePrefs } from '../../state/PrefsContext'

const ALL: Voice[] = ['S', 'A', 'T', 'B']
const COLOR: Record<Voice, string> = { S: '#B3261E', A: '#1F5BB5', T: '#3D6E12', B: '#8A4C08' }
const SZ = [[11, 18, 12], [13, 22, 13], [15, 26, 15]]   // [note px, row height, lyric px] per text size (PartitionLecture.dc.html)

/**
 * Landscape "Partition": the whole piece, one label + card per phrase, the phrase under the playhead ringed,
 * "Ma voix" in bold colour and the others smaller when "Voix en repère" is on.
 */
export default function LectureList() {
  const { score, currentBeat, seekTo } = usePlayer()
  const { myVoice, noMine, shown, fontSize, zoom, lyrics, big } = usePrefs()
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(700)
  useEffect(() => {
    const el = wrap.current; if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el); setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [score])
  if (!score) return null

  const bpm = score.beatsPerMeasure
  const [n0, h0, l0] = SZ[fontSize]
  const k = zoom / 100
  const mine: Voice | null = noMine ? null : myVoice
  const ref = big && !!mine
  const voices = ALL.filter(v => shown[v])
  const perRow = Math.max(1, Math.min(4, Math.floor((width - 24 - 20 - 20) / (bpm * 34 * k))))
  const curBeat = Math.floor(currentBeat)

  return (
    <div ref={wrap} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 12px 6px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {score.renderBlocks.map((block, bi) => {
        const rows: typeof block.measures[] = []
        for (let i = 0; i < block.measures.length; i += perRow) rows.push(block.measures.slice(i, i + perRow))
        const first = block.measures[0].index + 1, last = block.measures[block.measures.length - 1].index + 1
        const startB = block.measures[0].startBeat, endB = block.measures[block.measures.length - 1].startBeat + bpm
        const here = currentBeat >= startB && currentBeat < endB
        return (
          <section key={bi} style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6E6E73', letterSpacing: '0.06em', padding: '0 4px' }}>
              PHRASE {bi + 1} · MES. {first}{last > first ? `–${last}` : ''}
            </span>
            <div style={{ background: '#FFFFFF', borderRadius: 14, padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 1, boxShadow: here ? '0 0 0 2px #E2B861' : undefined }}>
              {rows.map((ms, ri) => {
                const cols = `20px repeat(${ms.length * bpm}, minmax(0, 1fr))`
                const cell = (m: typeof ms[number], j: number, mi: number): React.CSSProperties => ({
                  textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', cursor: 'pointer',
                  borderLeft: j === 0 && mi > 0 ? '1px solid #E5E5EA' : undefined,
                  background: Math.floor(curBeat / bpm) === m.index ? '#FFF6E3' : undefined,
                })
                return (
                  <div key={ri} style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: ri ? 4 : 0 }}>
                    {voices.map(v => {
                      const isMine = v === mine, dim = ref && !isMine
                      const size = (n0 + (isMine && ref ? 3 : 0) - (dim ? 1 : 0)) * k
                      const h = (h0 + (isMine && ref ? 6 : 0) - (dim ? 2 : 0)) * k
                      const color = dim ? '#6E6E73' : isMine && ref ? COLOR[v] : '#1D1D1F'
                      return (
                        <div key={v} style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: COLOR[v] }}>{v}</span>
                          {ms.flatMap((m, mi) => Array.from({ length: bpm }, (_, j) => (
                            <span key={`${mi}-${j}`} onClick={() => seekTo(m.startBeat + j)} style={{
                              ...cell(m, j, mi), fontFamily: "'JetBrains Mono', var(--mono), monospace", fontSize: size, height: h, lineHeight: `${h}px`, color, fontWeight: isMine && ref ? 700 : 500,
                            }}>{m.beats[v][j]?.raw ?? ''}</span>
                          )))}
                        </div>
                      )
                    })}
                    {lyrics && (
                      <div style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', borderTop: '1px dashed #E5E5EA', marginTop: 2 }}>
                        <span />
                        {ms.flatMap((m, mi) => Array.from({ length: bpm }, (_, j) => (
                          <span key={`${mi}-${j}`} style={{
                            ...cell(m, j, mi), cursor: 'default', textOverflow: 'ellipsis', fontSize: l0 * k, fontWeight: 600, height: (l0 + 10) * k, lineHeight: `${(l0 + 10) * k}px`, color: '#1D1D1F',
                          }}>{m.beats.S[j]?.lyric ?? ''}</span>
                        )))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

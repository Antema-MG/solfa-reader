import { useRef, useEffect } from 'react'
import type { Voice, MsolfaPlayerState } from '../types'
import { DEFAULT_PIECE } from '../lib/defaults'
import { usePlayer } from '../state/PlayerContext'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']
const VOICE_VAR: Record<Voice, string> = { S:'--s', A:'--a', T:'--t', B:'--b' }

function isVoiceAudible(player: MsolfaPlayerState, v: Voice) {
  if (player.solo.size > 0) return player.solo.has(v)
  return !player.muted[v]
}

export default function ScoreView() {
  const player = usePlayer()
  const { score, error, status, currentBeat, seekTo } = player
  const activeBi = Math.floor(currentBeat)
  const wrapRef  = useRef<HTMLDivElement>(null)

  // Auto-scroll active soprano cell into view while playing
  useEffect(() => {
    if (status !== 'playing' || !wrapRef.current) return
    const el = wrapRef.current.querySelector<HTMLElement>(`[data-bi="${activeBi}"][data-voice="S"]`)
    if (!el) return
    const wrap = wrapRef.current
    const r  = el.getBoundingClientRect()
    const wr = wrap.getBoundingClientRect()
    if (r.top < wr.top + 40 || r.bottom > wr.bottom - 40)
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeBi, status])

  return (
    <div ref={wrapRef} style={{
      flex:1, overflowY:'auto', padding:'18px 16px', background:'var(--bg)',
    }}>

      {/* Error */}
      {error && (
        <div style={{
          background:'rgba(192,57,43,0.14)', border:'1px solid rgba(192,57,43,0.4)',
          borderRadius:8, padding:'12px 16px', marginBottom:14,
        }}>
          <p style={{ color:'#e24b4a', fontWeight:700, marginBottom:6 }}>Fichier .msolfa invalide</p>
          {error.split('\n').map((ln, i) => (
            <p key={i} style={{ color:'#f0a59c', fontSize:13, fontFamily:'var(--mono)', margin:'2px 0' }}>{ln}</p>
          ))}
        </div>
      )}

      {/* Empty state — format preview */}
      {!score && !error && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <p style={{ fontSize:12, color:'var(--text3)' }}>
            Ouvrir un fichier .msolfa · glisser-déposer accepté · Exemple :
          </p>
          <pre style={{
            fontFamily:'var(--mono)', fontSize:12, color:'var(--text2)',
            lineHeight:1.7, background:'var(--bg2)',
            border:'1px solid var(--border)', borderRadius:8,
            padding:'14px 16px', overflowX:'auto',
          }}>{DEFAULT_PIECE}</pre>
        </div>
      )}

      {/* Score */}
      {score && score.renderBlocks.map((block, bi) => (
        <div key={bi} style={{ marginBottom:20 }}>
          {block.comment && (
            <div style={{ color:'var(--text3)', fontSize:12, fontFamily:'var(--mono)', marginBottom:6, letterSpacing:'.03em' }}>
              {block.comment}
            </div>
          )}
          {VOICES.map(v => (
            <div key={v} style={{
              display:'flex', alignItems:'center',
              fontFamily:'var(--mono)', fontSize:13, marginBottom:3,
            }}>
              {/* Voice label */}
              <span style={{ width:26, flex:'none', fontWeight:700, color:`var(${VOICE_VAR[v]})` }}>
                {v}.
              </span>
              {/* Beats */}
              <span style={{ display:'inline-flex', alignItems:'center' }}>
                <span style={{ color:'var(--text3)', padding:'0 6px', fontWeight:300 }}>||</span>
                {block.measures.map((measure, mi) => (
                  <span key={measure.index} style={{ display:'inline-flex', alignItems:'center' }}>
                    {Array.from({ length: score.beatsPerMeasure }, (_, j) => {
                      const bi2 = measure.startBeat + j
                      const beat = measure.beats[v][j]
                      const raw  = beat?.raw ?? '·'
                      const active = bi2 === activeBi && isVoiceAudible(player, v)
                      return (
                        <span key={j} style={{ display:'inline-flex', alignItems:'center' }}>
                          {j > 0 && (
                            <span style={{ color:'var(--text3)', padding:'0 3px' }}>:</span>
                          )}
                          <span
                            data-bi={bi2}
                            data-voice={v}
                            onClick={() => seekTo(bi2)}
                            style={{
                              padding:'3px 5px', borderRadius:4,
                              minWidth:22, textAlign:'center',
                              cursor:'pointer',
                              background: active ? `var(${VOICE_VAR[v]}-bg, rgba(255,255,255,0.08))` : undefined,
                              color:       active ? `var(${VOICE_VAR[v]})` : 'var(--text2)',
                              fontWeight:  active ? 700 : undefined,
                              outline:     undefined,
                            }}
                          >{raw}</span>
                        </span>
                      )
                    })}
                    <span style={{ color:'var(--text3)', padding:'0 6px', fontWeight:300 }}>
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

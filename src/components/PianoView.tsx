import type { MsolfaPlayerState, Voice } from '../types'
import { midiToFrenchName } from '../lib/pitch'

const PIANO_LOW  = 24  // C1
const PIANO_HIGH = 84  // C6
const WHITE_NOTES = ['C','D','E','F','G','A','B']
const WHITE_SEMIS = [0,2,4,5,7,9,11]
const HAS_BLACK   = new Set(['C','D','F','G','A'])

interface WKey { midi: number; wIdx: number; isC: boolean; oct: number }
interface BKey { midi: number; leftPx: number }

function buildKeys() {
  const whites: WKey[] = []
  const blacks: BKey[] = []
  let wIdx = 0
  for (let oct = 1; oct <= 6; oct++) {
    WHITE_NOTES.forEach((note, ni) => {
      const midi = (oct + 1) * 12 + WHITE_SEMIS[ni]
      if (midi > PIANO_HIGH) return
      whites.push({ midi, wIdx, isC: note === 'C', oct })
      if (HAS_BLACK.has(note)) {
        const bm = midi + 1
        if (bm <= PIANO_HIGH) blacks.push({ midi: bm, leftPx: wIdx * 23 + 16 })
      }
      wIdx++
    })
  }
  return { whites, blacks }
}

const { whites, blacks } = buildKeys()
const ALL_VOICES: Voice[] = ['S','A','T','B']
const VOICE_LABEL: Record<Voice, string> = { S:'Soprano', A:'Alto', T:'Ténor', B:'Basse' }

interface Props { player: MsolfaPlayerState }

export default function PianoView({ player }: Props) {
  const { litMidis, tonic } = player

  // Invert litMidis → midi→voice for fast lookup
  const midiVoice: Record<number, Voice> = {}
  ALL_VOICES.forEach(v => {
    const m = litMidis[v]
    if (m != null) midiVoice[m] = v
  })

  function keyColor(midi: number, isWhite: boolean): string {
    const v = midiVoice[midi]
    if (v) return `var(--${v.toLowerCase()})`
    return isWhite ? '#efece4' : '#16161a'
  }

  // Banner note names
  const leftNote  = litMidis['B'] != null ? midiToFrenchName(litMidis['B']!, tonic) : '—'
  const rightNotes = (['S','A','T'] as Voice[])
    .filter(v => litMidis[v] != null)
    .map(v => ({ v, name: midiToFrenchName(litMidis[v]!, tonic) }))

  return (
    <div style={{ flex:'none', background:'var(--bg2)', borderTop:'1px solid var(--border)' }}>
      {/* Hand banner */}
      <div style={{
        display:'flex', gap:18, alignItems:'center',
        padding:'9px 16px', fontSize:13,
        borderBottom:'1px solid var(--border)', flexWrap:'wrap',
      }}>
        <div>
          <span style={{ fontSize:11, color:'var(--text3)', marginRight:6 }}>Main Gauche</span>
          <span style={{
            padding:'3px 9px', borderRadius:4, fontSize:12, fontWeight:600,
            fontFamily:'var(--mono)', background:'var(--b-bg)', color:'var(--b)',
            display:'inline-block',
          }}>{leftNote}</span>
        </div>
        <div style={{ width:1, height:22, background:'var(--border2)' }} />
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ fontSize:11, color:'var(--text3)', marginRight:6 }}>Main Droite</span>
          {rightNotes.length > 0
            ? rightNotes.map(({ v, name }) => (
                <span key={v} style={{
                  padding:'3px 9px', borderRadius:4, fontSize:12, fontWeight:600,
                  fontFamily:'var(--mono)', display:'inline-block',
                  background:`var(--${v.toLowerCase()}-bg)`, color:`var(--${v.toLowerCase()})`,
                }}>{name}</span>
              ))
            : <span style={{
                padding:'3px 9px', borderRadius:4, fontSize:12, fontWeight:600,
                fontFamily:'var(--mono)', background:'var(--s-bg)', color:'var(--s)',
                display:'inline-block',
              }}>—</span>
          }
        </div>
      </div>

      {/* Keys */}
      <div style={{ overflowX:'auto', padding:'16px 16px 32px' }}>
        <div style={{
          position:'relative', height:104,
          width: whites.length * 23, margin:'0 auto', display:'flex',
        }}>
          {whites.map(k => (
            <div key={k.midi} style={{
              width:23, height:104,
              background: keyColor(k.midi, true),
              border:'1px solid #b8b4aa',
              borderRadius:'0 0 4px 4px',
              position:'relative', flex:'none',
              display:'flex', alignItems:'flex-end', justifyContent:'center',
              paddingBottom:4,
              transition:'background 0.05s',
            }}>
              {k.isC && (
                <span style={{
                  position:'absolute', bottom:-18,
                  left:'50%', transform:'translateX(-50%)',
                  fontSize:9, color:'var(--text3)', fontFamily:'var(--mono)', whiteSpace:'nowrap',
                }}>C{k.oct}</span>
              )}
            </div>
          ))}
          {blacks.map(k => (
            <div key={k.midi} style={{
              width:14, height:64,
              background: keyColor(k.midi, false),
              border:'1px solid #000',
              borderRadius:'0 0 3px 3px',
              position:'absolute', top:0, zIndex:3,
              left: k.leftPx,
              transition:'background 0.05s',
            }} />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display:'flex', gap:16, justifyContent:'center',
        padding:'0 16px 12px', flexWrap:'wrap',
      }}>
        {ALL_VOICES.map(v => (
          <div key={v} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text2)' }}>
            <span style={{
              width:11, height:11, borderRadius:3, display:'inline-block',
              background:`var(--${v.toLowerCase()})`,
            }} />
            {VOICE_LABEL[v]}
          </div>
        ))}
        <span style={{ fontSize:11, color:'var(--text3)' }}>
          Cliquer un temps (en pause) = apprentissage · glisser = boucle
        </span>
      </div>
    </div>
  )
}

import { Voice } from '../types'
import { usePlayer } from '../state/PlayerContext'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']
const VOICE_LABEL: Record<Voice, string> = { S: 'Soprano', A: 'Alto', T: 'Ténor', B: 'Basse' }
const VOICE_VAR:  Record<Voice, string> = { S: '--s', A: '--a', T: '--t', B: '--b' }

export default function VoiceBar() {
  const { muted, solo, toggleMute, toggleSolo, clearSelection } = usePlayer()

  return (
    <div style={{
      flex: 'none', background: 'var(--bg2)',
      borderBottom: '1px solid var(--border)',
      padding: '8px 16px', display: 'flex',
      gap: 8, alignItems: 'center', flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
        Voix
      </span>

      {VOICES.map(v => (
        <button
          key={v}
          onClick={() => toggleMute(v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 18,
            border: `1px solid var(${VOICE_VAR[v]})`,
            color: `var(${VOICE_VAR[v]})`,
            background: 'transparent',
            fontSize: 12, fontWeight: 600,
            opacity: muted[v] ? 0.32 : 1,
            textDecoration: muted[v] ? 'line-through' : 'none',
          }}
        >
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: `var(${VOICE_VAR[v]})`,
          }} />
          {VOICE_LABEL[v]}
        </button>
      ))}

      <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 14, textTransform: 'uppercase', letterSpacing: '.08em' }}>
        Solo
      </span>

      {VOICES.map(v => (
        <button
          key={v}
          onClick={() => toggleSolo(v)}
          style={{
            fontSize: 10, padding: '4px 7px', borderRadius: 5,
            border: '1px solid var(--border2)',
            background: solo.has(v) ? 'var(--accent)' : 'var(--bg4)',
            color: solo.has(v) ? '#1a1a1a' : 'var(--text2)',
            fontWeight: 700,
          }}
        >{v}</button>
      ))}

      <button
        onClick={clearSelection}
        style={{
          marginLeft: 'auto', fontSize: 11, padding: '5px 10px',
          background: 'var(--bg4)', border: '1px solid var(--border2)',
          color: 'var(--text)', borderRadius: 6,
        }}
      >
        Effacer sélection
      </button>
    </div>
  )
}

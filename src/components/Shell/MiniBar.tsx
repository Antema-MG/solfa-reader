import { usePlayer } from '../../state/PlayerContext'
import { useVoiceMix } from '../../hooks/useVoiceMix'
import { INK, TEXT2, PauseIcon, PlayIcon } from './controls'

/** Phone: the bar above the tab bar that keeps the current score one tap away (Main.dc.html). */
export default function MiniBar({ onOpen }: { onOpen: () => void }) {
  const { score, currentBeat, isPlaying, play, pause } = usePlayer()
  const mix = useVoiceMix()
  if (!score) return null
  const starts = score.renderBlocks.map(b => b.measures[0].startBeat)
  let phrase = 1
  starts.forEach((s, i) => { if (s <= currentBeat) phrase = i + 1 })
  const how = mix.label
  return (
    <div role="button" tabIndex={0} aria-label="Ouvrir le lecteur" onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      style={{
        flex: 'none', margin: '0 10px 8px', height: 58, borderRadius: 14, background: 'rgba(255,255,255,0.92)', boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px 0 10px', color: INK, cursor: 'pointer',
      }}>
      <span style={{ width: 40, height: 40, borderRadius: 9, background: INK, color: '#C8A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
        {score.metadata.key}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{score.metadata.title}</span>
        <span style={{ fontSize: 12, color: TEXT2 }}>Phrase {phrase} · {how}</span>
      </span>
      <button type="button" aria-label={isPlaying ? 'Pause' : 'Lecture'} onClick={e => { e.stopPropagation(); isPlaying ? pause() : play() }}
        style={{ width: 44, height: 44, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK }}>
        {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
      </button>
    </div>
  )
}

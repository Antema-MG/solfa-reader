import type { MsolfaPlayerState } from '../types'

interface Props { player: MsolfaPlayerState }

export default function ProgressBar({ player }: Props) {
  const { score, currentBeat, seekTo } = player
  const pct = score ? (currentBeat / score.totalBeats) * 100 : 0

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!score) return
    const rect = e.currentTarget.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seekTo(frac * score.totalBeats)
  }

  return (
    <div style={{
      flex:'none', padding:'10px 16px',
      background:'var(--bg2)', borderTop:'1px solid var(--border)',
    }}>
      <div
        onClick={handleClick}
        style={{
          height:6, background:'var(--bg4)',
          borderRadius:3, position:'relative',
          cursor: score ? 'pointer' : 'default',
        }}
      >
        <div style={{
          height:6, background:'var(--accent)',
          borderRadius:3, width:`${pct}%`,
          transition: 'width 0.05s linear',
        }} />
      </div>
    </div>
  )
}

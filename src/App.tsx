import { useEffect } from 'react'
import { useMsolfaPlayer } from './hooks/useMsolfaPlayer'
import TopBar      from './components/TopBar'
import VoiceBar    from './components/VoiceBar'
import ScoreView   from './components/ScoreView'
import ProgressBar from './components/ProgressBar'
import PianoView   from './components/PianoView'

export default function App() {
  const player = useMsolfaPlayer()
  const { score, isPlaying, play, pause, openFile } = player

  // Drag & drop
  useEffect(() => {
    const onDragOver = (e: DragEvent) => e.preventDefault()
    const onDrop     = async (e: DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer?.files[0]
      if (file) openFile(await file.text())
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop',     onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop',     onDrop)
    }
  }, [openFile])

  // Spacebar = play/pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && score) {
        e.preventDefault()
        isPlaying ? pause() : play()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [score, isPlaying, play, pause])

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh' }}>
      <TopBar      player={player} />
      <VoiceBar    player={player} />
      <ScoreView   player={player} />
      <ProgressBar player={player} />
      <PianoView   player={player} />
    </div>
  )
}

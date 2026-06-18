import { useEffect } from 'react'
import { PlayerProvider, usePlayer } from './state/PlayerContext'
import TopBar      from './components/TopBar'
import VoiceBar    from './components/VoiceBar'
import ScoreView   from './components/ScoreView'
import ProgressBar from './components/ProgressBar'
import PianoView   from './components/PianoView'

function AppShell() {
  const { score, isPlaying, play, pause, openFile } = usePlayer()

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
      <TopBar />
      <VoiceBar />
      <ScoreView />
      <ProgressBar />
      <PianoView />
    </div>
  )
}

export default function App() {
  return (
    <PlayerProvider>
      <AppShell />
    </PlayerProvider>
  )
}

import { useEffect, useState } from 'react'
import { PlayerProvider, usePlayer } from './state/PlayerContext'
import { EditorProvider, useEditor } from './state/EditorContext'
import TopBar        from './components/TopBar'
import VoiceBar      from './components/VoiceBar'
import ScoreView     from './components/ScoreView'
import ProgressBar   from './components/ProgressBar'
import PianoView     from './components/PianoView'
import RhythmToolbar from './components/Editor/RhythmToolbar'
import MethodView    from './components/Learn/MethodView'

const DEGREE_KEYS = new Set(['d', 'r', 'm', 'f', 's', 'l', 't'])

type View = 'player' | 'learn'

function ModeTabs({ view, setView }: { view: View; setView: (v: View) => void }) {
  const tab = (v: View, label: string): React.CSSProperties => ({
    border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 999,
    fontSize: 13, fontWeight: 700,
    background: view === v ? 'var(--accent)' : 'transparent',
    color: view === v ? '#0f0f12' : 'var(--text2)',
  })
  return (
    <div style={{
      flex: 'none', display: 'flex', justifyContent: 'center', gap: 6,
      padding: '8px', background: 'var(--bg)', borderBottom: '1px solid var(--border)',
    }}>
      <button type="button" style={tab('player', '')} onClick={() => setView('player')}>🎹 Lecteur</button>
      <button type="button" style={tab('learn', '')} onClick={() => setView('learn')}>🎓 Apprendre</button>
    </div>
  )
}

function AppShell() {
  const { score, isPlaying, play, pause, openFile } = usePlayer()
  const { isEditing, move, apply, exit } = useEditor()

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

  // Spacebar = play/pause (stays a play PREVIEW even while editing — never moves the cursor)
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

  // Edit-mode keys: arrows navigate cells, letters set notes, no spacebar to move.
  useEffect(() => {
    if (!isEditing) return
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); move('left');  return
        case 'ArrowRight': e.preventDefault(); move('right'); return
        case 'ArrowUp':    e.preventDefault(); move('up');    return
        case 'ArrowDown':  e.preventDefault(); move('down');  return
        case 'Escape':     e.preventDefault(); exit();        return
        case "'": e.preventDefault(); apply({ type: 'octave', value: 1 });  return
        case ',': e.preventDefault(); apply({ type: 'octave', value: -1 }); return
        case '+': case '#': e.preventDefault(); apply({ type: 'accidental', value: 'sharp' }); return
        case '-': e.preventDefault(); apply({ type: 'accidental', value: 'flat' }); return
      }
      if (e.key === '1') { e.preventDefault(); apply({ type: 'rhythm', value: 'note' }) }
      else if (e.key === '2') { e.preventDefault(); apply({ type: 'rhythm', value: 'pair' }) }
      else if (e.key === '3') { e.preventDefault(); apply({ type: 'rhythm', value: 'tie' }) }
      else if (e.key === '4') { e.preventDefault(); apply({ type: 'rhythm', value: 'rest' }) }
      else if (DEGREE_KEYS.has(e.key.toLowerCase())) { e.preventDefault(); apply({ type: 'degree', value: e.key.toLowerCase() }) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isEditing, move, apply, exit])

  return (
    <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column' }}>
      <TopBar />
      <VoiceBar />
      <ScoreView />
      {isEditing ? <RhythmToolbar /> : <ProgressBar />}
      <PianoView />
    </div>
  )
}

function Root() {
  const [view, setView] = useState<View>('player')
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh' }}>
      <ModeTabs view={view} setView={setView} />
      {view === 'player' ? <AppShell /> : <MethodView />}
    </div>
  )
}

export default function App() {
  return (
    <PlayerProvider>
      <EditorProvider>
        <Root />
      </EditorProvider>
    </PlayerProvider>
  )
}

import { useEffect, useState } from 'react'
import { PlayerProvider, usePlayer } from './state/PlayerContext'
import { EditorProvider, useEditor } from './state/EditorContext'
import { PrefsProvider } from './state/PrefsContext'
import { LibraryProvider, useLibrary, newId } from './state/LibraryContext'
import GuidedEditor, { type Draft } from './components/Editor/GuidedEditor'
import MethodView    from './components/Learn/MethodView'
import CatalogView   from './components/Catalog/CatalogView'
import { useLandscape, useWide } from './components/Shell/ui'
import { ScorePane } from './components/Shell/Landscape'
import { ChoirPanel, ChoirView, ListenView, ScoreScreen, useListenMode, useMySound } from './components/Shell/Views'

const DEGREE_KEYS = new Set(['d', 'r', 'm', 'f', 's', 'l', 't'])

type View = 'library' | 'listen' | 'score' | 'choir' | 'learn' | 'editor'

const TABS: { id: View; label: string; icon: string }[] = [
  { id: 'library', label: 'Bibliothèque', icon: 'M4 4h4v16H4zM10 4h4v16h-4zM16.5 4.5l3.5 1-4 15-3.5-1z' },
  { id: 'listen',  label: 'Écoute',       icon: 'M3 5h18v14H3zM8 5v9M12 5v9M16 5v9' },
  { id: 'score',   label: 'Partition',    icon: 'M5 4h14v16H5zM8 9h8M8 13h8M8 17h5' },
  { id: 'choir',   label: 'Chorale',      icon: 'M8 9m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M16 9m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M3 19c0-3 2.2-5 5-5s5 2 5 5M11 19c0-3 2.2-5 5-5s5 2 5 5' },
  { id: 'learn',   label: 'Apprendre',    icon: 'M12 3 2 8l10 5 10-5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5' },
]

function BottomNav({ view, setView }: { view: View; setView: (v: View) => void }) {
  const active = view === 'editor' ? 'library' : view
  return (
    <nav aria-label="Navigation" style={{
      flex: 'none', display: 'grid', gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))`,
      padding: '6px 6px max(8px, env(safe-area-inset-bottom))', background: 'var(--bg2)', borderTop: '1px solid var(--border)',
    }}>
      {TABS.map(t => (
        <button key={t.id} type="button" aria-current={active === t.id ? 'page' : undefined} onClick={() => setView(t.id)} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minHeight: 48, border: 'none', background: 'transparent',
          color: active === t.id ? 'var(--accent-ink)' : 'var(--text2)', fontSize: 10, fontWeight: active === t.id ? 700 : 500,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.icon} /></svg>
          {t.label}
        </button>
      ))}
    </nav>
  )
}

/** Global behaviours: drag & drop, space = play/pause, edit-mode keys, listen mode. */
function GlobalBehaviours({ onOpened }: { onOpened: () => void }) {
  const { score, isPlaying, play, pause, openFile } = usePlayer()
  const { isEditing, move, apply, exit } = useEditor()
  useListenMode()
  useMySound()

  useEffect(() => {
    const over = (e: DragEvent) => e.preventDefault()
    const drop = async (e: DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer?.files[0]
      if (file) { openFile(await file.text()); onOpened() }
    }
    window.addEventListener('dragover', over); window.addEventListener('drop', drop)
    return () => { window.removeEventListener('dragover', over); window.removeEventListener('drop', drop) }
  }, [openFile, onOpened])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (e.code === 'Space' && score && tag !== 'BUTTON' && tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') {
        e.preventDefault(); isPlaying ? pause() : play()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [score, isPlaying, play, pause])

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

  return null
}

const DESKTOP_TABS: { id: View; label: string }[] = [
  { id: 'listen', label: 'Écoute' }, { id: 'score', label: 'Partition' }, { id: 'learn', label: 'Apprendre' },
]

function Root() {
  const wide = useWide()
  const landscape = useLandscape()
  return landscape ? <LandscapeRoot /> : wide ? <DesktopRoot /> : <MobileRoot />
}

/** Phone held sideways: icon rail on the left, the score takes everything else. */
function LandscapeRoot() {
  const [view, setView] = useState<View>('listen')
  const { openFile } = usePlayer()
  const lib = useLibrary()
  const [draft, setDraft] = useState<Draft | null>(null)
  const active = view === 'editor' ? 'library' : view
  return (
    <div style={{ display: 'flex', height: '100dvh', background: 'var(--bg)' }}>
      <GlobalBehaviours onOpened={() => setView('listen')} />
      <nav aria-label="Navigation" style={{
        flex: 'none', width: 'calc(56px + env(safe-area-inset-left))', boxSizing: 'border-box', paddingLeft: 'env(safe-area-inset-left)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, background: 'var(--bg2)', borderRight: '1px solid var(--border)',
      }}>
        {TABS.map(t => (
          <button key={t.id} type="button" aria-label={t.label} title={t.label} aria-current={active === t.id ? 'page' : undefined} onClick={() => setView(t.id)} style={{
            height: 52, border: 'none', background: active === t.id ? 'var(--cur)' : 'transparent',
            color: active === t.id ? 'var(--accent-ink)' : 'var(--text2)', display: 'grid', placeItems: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.icon} /></svg>
          </button>
        ))}
      </nav>
      <main style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', paddingRight: 'env(safe-area-inset-right)' }}>
        {view === 'library' && <CatalogView onOpen={text => { openFile(text); setView('listen') }} onFix={d => { setDraft(d); setView('editor') }} />}
        {view === 'listen' && <ScorePane withPiano />}
        {view === 'score' && <ScorePane withPiano={false} />}
        {view === 'choir' && <ChoirPanel />}
        {view === 'learn' && <MethodView />}
        {view === 'editor' && draft && (
          <GuidedEditor key={draft.id ?? draft.name} draft={draft} onCancel={() => setView('library')} onSave={(d, text) => {
            lib.save({ id: d.id ?? newId(d.name), name: d.name, text, origin: d.origin })
            openFile(text); setView('listen')
          }} />
        )}
      </main>
    </div>
  )
}

/** Desktop web: header + [library | score | choir] columns. */
function DesktopRoot() {
  const [view, setView] = useState<View>('listen')
  const { openFile, score } = usePlayer()
  const lib = useLibrary()
  const [draft, setDraft] = useState<Draft | null>(null)
  const active = view === 'editor' ? 'listen' : view
  const showSide = view === 'listen' || view === 'score'
  const [current, setCurrent] = useState<string>()
  const open = (text: string) => { openFile(text); setCurrent(text); if (view === 'editor' || view === 'learn') setView('listen') }
  const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, background: 'var(--bg)' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)' }}>
      <GlobalBehaviours onOpened={() => setView('listen')} />
      <header style={{ flex: 'none', height: 56, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 18, background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <b style={{ fontSize: 18, fontWeight: 800 }}>Msolfa</b>
        <nav aria-label="Navigation" style={{ display: 'flex', padding: 2, borderRadius: 10, background: 'var(--bg4)' }}>
          {DESKTOP_TABS.map(t => (
            <button key={t.id} type="button" aria-current={active === t.id ? 'page' : undefined} onClick={() => setView(t.id)} style={{
              height: 32, padding: '0 16px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: active === t.id ? 700 : 500,
              background: active === t.id ? 'var(--bg2)' : 'transparent', color: 'var(--text)',
              boxShadow: active === t.id ? '0 1px 3px rgba(0,0,0,.12)' : undefined,
            }}>{t.label}</button>
          ))}
        </nav>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Espace : lecture / pause</span>
      </header>
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: showSide ? '280px minmax(0, 1fr) 300px' : '280px minmax(0, 1fr)', gap: 1, background: 'var(--border)' }}>
        <aside style={col} aria-label="Bibliothèque">
          <CatalogView compact activeText={score ? current : undefined} onOpen={open} onFix={d => { setDraft(d); setView('editor') }} />
        </aside>
        <main style={col}>
          {view === 'listen' && <ListenView />}
          {view === 'score' && <ScoreScreen />}
          {view === 'learn' && <MethodView />}
          {view === 'editor' && draft && (
            <GuidedEditor key={draft.id ?? draft.name} draft={draft} onCancel={() => setView('listen')} onSave={(d, text) => {
              lib.save({ id: d.id ?? newId(d.name), name: d.name, text, origin: d.origin })
              openFile(text); setView('listen')
            }} />
          )}
        </main>
        {showSide && <aside style={{ ...col, background: 'var(--bg)' }} aria-label="Chorale"><ChoirPanel /></aside>}
      </div>
    </div>
  )
}

function MobileRoot() {
  const [view, setView] = useState<View>('library')
  const { openFile } = usePlayer()
  const lib = useLibrary()
  const [draft, setDraft] = useState<Draft | null>(null)
  const goListen = () => setView('listen')
  const goLibrary = () => setView('library')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 960, margin: '0 auto', background: 'var(--bg)' }}>
      <GlobalBehaviours onOpened={goListen} />
      <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {view === 'library' && <CatalogView onOpen={text => { openFile(text); goListen() }} onFix={d => { setDraft(d); setView('editor') }} />}
        {view === 'editor' && draft && (
          <GuidedEditor key={draft.id ?? draft.name} draft={draft} onCancel={goLibrary} onSave={(d, text) => {
            lib.save({ id: d.id ?? newId(d.name), name: d.name, text, origin: d.origin })
            openFile(text); goListen()
          }} />
        )}
        {view === 'listen'  && <ListenView goLibrary={goLibrary} />}
        {view === 'score'   && <ScoreScreen goLibrary={goLibrary} />}
        {view === 'choir'   && <ChoirView goLibrary={goLibrary} />}
        {view === 'learn'   && <MethodView />}
      </main>
      <BottomNav view={view} setView={setView} />
    </div>
  )
}

export default function App() {
  return (
    <PlayerProvider>
      <EditorProvider>
        <PrefsProvider>
          <LibraryProvider>
            <Root />
          </LibraryProvider>
        </PrefsProvider>
      </EditorProvider>
    </PlayerProvider>
  )
}

import { useEffect, useRef, useState } from 'react'
import { editModelToText } from './domain/serialize'
import { catalogPathFor, normalizedText } from './domain/catalogFiles'
import { PlayerProvider, usePlayer } from './state/PlayerContext'
import { EditorProvider, useEditor } from './state/EditorContext'
import { PrefsProvider, usePrefs } from './state/PrefsContext'
import { LibraryProvider, useLibrary, newId } from './state/LibraryContext'
import GuidedEditor, { type Draft } from './components/Editor/GuidedEditor'
import MethodView    from './components/Learn/MethodView'
import CatalogView   from './components/Catalog/CatalogView'
import MiniBar       from './components/Shell/MiniBar'
import LandscapeChoir from './components/Shell/LandscapeChoir'
import { useLandscape, useWide } from './components/Shell/ui'
import RecordChoir from './components/Choir/RecordChoir'
import { LandscapePlayer } from './components/Shell/LandscapePlayer'
import ReadSettings from './components/Shell/ReadSettings'
import { ChoirPanel, ChoirView, ListenView, ScoreScreen, useMySound } from './components/Shell/Views'

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
      padding: '8px 8px max(28px, env(safe-area-inset-bottom))', background: 'rgba(249,249,251,0.96)', borderTop: '1px solid #E5E5EA',
    }}>
      {TABS.map(t => (
        <button key={t.id} type="button" aria-current={active === t.id ? 'page' : undefined} onClick={() => setView(t.id)} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minHeight: 46, border: 'none', background: 'transparent',
          color: active === t.id ? '#85632A' : '#6E6E73', fontSize: 10, fontWeight: active === t.id ? 600 : 500,
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
  const { isEditing, move, apply, exit, model, docId, adopt } = useEditor()
  const lib = useLibrary()
  // Every edit is saved to the library (this device), whatever the score came from.
  // A score already in the library is updated in place; a catalog / dropped / default
  // score gets its own copy on the first real change (not just for opening the editor).
  const entry = useRef<string | null>(null)
  const origin = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!isEditing || !model) { entry.current = null; origin.current = undefined; return }
    const text = editModelToText(model)
    if (entry.current === null) { entry.current = text; return }
    if (docId || text === entry.current) return
    const hit = lib.items.find(i => normalizedText(i.text) === entry.current)
    // Came from a bundled catalog file: the copy takes its place (same file in dev, hides the original).
    origin.current = hit ? undefined : catalogPathFor(entry.current) ?? undefined
    adopt(hit?.id ?? newId(model.meta.title || 'partition'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, isEditing, docId])
  useEffect(() => {
    if (!docId || !model) return
    const old = lib.items.find(i => i.id === docId)
    const text = editModelToText(model)
    if (old?.text === text) return                       // nothing changed: keep its place in the list
    lib.save({ id: docId, name: model.meta.title || old?.name || 'Nouvelle partition', text, origin: old?.origin ?? origin.current })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, docId])
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
      else if (e.key === '3') { e.preventDefault(); apply({ type: 'rhythm', value: 'triple' }) }
      else if (e.key === '4') { e.preventDefault(); apply({ type: 'rhythm', value: 'quad' }) }
      else if (e.key === '5') { e.preventDefault(); apply({ type: 'rhythm', value: 'tie' }) }
      else if (e.key === '6') { e.preventDefault(); apply({ type: 'rhythm', value: 'rest' }) }
      else {
        // Note letters: plain = natural · Shift = sharp (Maj+D → di) · Ctrl or Alt = flat (Ctrl+D → da).
        // Alt is there because Ctrl+T (si bémol) is reserved by browsers. e.code covers macOS, where ⌥D types ∂.
        const letter = /^[a-z]$/i.test(e.key) ? e.key.toLowerCase() : e.code.startsWith('Key') ? e.code.slice(3).toLowerCase() : ''
        if (!DEGREE_KEYS.has(letter) || e.metaKey || (e.ctrlKey && e.altKey)) return
        e.preventDefault()
        apply({ type: 'degree', value: letter, chromatic: e.shiftKey ? 1 : e.ctrlKey || e.altKey ? -1 : 0 })
      }
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
  const { editNew } = useEditor()
  const lib = useLibrary()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [recording, setRecording] = useState(false)
  const { chromeL, set } = usePrefs()
  const active = view === 'editor' ? 'library' : view
  // Reading the score (Écoute / Partition): rail, header and transport hidden by default, so only the score shows.
  const reading = view === 'listen' || view === 'score'
  const bare = reading && !chromeL
  return (
    <div style={{ position: 'relative', display: 'flex', height: '100dvh', background: 'var(--bg)' }}>
      <GlobalBehaviours onOpened={() => setView('listen')} />
      {bare && <ReadSettings onShowAll={() => set('chromeL', true)} />}
      {!bare && <nav aria-label="Navigation" style={{
        flex: 'none', width: 'calc(64px + env(safe-area-inset-left))', boxSizing: 'border-box', padding: '6px 0', paddingLeft: 'env(safe-area-inset-left)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'rgba(249,249,251,0.96)', borderRight: '1px solid #E5E5EA',
      }}>
        {TABS.map(t => (
          <button key={t.id} type="button" aria-label={t.label} title={t.label} aria-current={active === t.id ? 'page' : undefined} onClick={() => setView(t.id)} style={{
            height: 62, border: 'none', background: 'transparent', color: active === t.id ? '#85632A' : '#6E6E73', fontSize: 10, fontWeight: active === t.id ? 600 : 500,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.icon} /></svg>{t.label}
          </button>
        ))}
        {reading && (
          <button type="button" aria-label="Masquer les commandes" title="Masquer : partition seule" onClick={() => set('chromeL', false)} style={{
            height: 48, border: 'none', background: 'transparent', color: '#6E6E73', fontSize: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>Masquer
          </button>
        )}
      </nav>}
      <main style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', paddingRight: 'env(safe-area-inset-right)' }}>
        {view === 'library' && <CatalogView landscape onOpen={text => { openFile(text); setView('listen') }} onRead={text => { openFile(text); setView('score') }} onFix={d => { setDraft(d); setView('editor') }}
          onCreate={(text, id) => { openFile(text); editNew(id); setView('score') }} />}
        {view === 'listen' && <LandscapePlayer withPiano onRecord={() => setRecording(true)} />}
        {view === 'score' && <LandscapePlayer withPiano={false} />}
        {view === 'choir' && <LandscapeChoir onRecord={() => setRecording(true)} />}
        {view === 'learn' && <MethodView />}
        {view === 'editor' && draft && (
          <GuidedEditor key={draft.id ?? draft.name} draft={draft} onCancel={() => setView('library')} onSave={(d, text) => {
            lib.save({ id: d.id ?? newId(d.name), name: d.name, text, origin: d.origin })
            openFile(text); setView('listen')
          }} />
        )}
      </main>
      {recording && <RecordChoir onClose={() => setRecording(false)} />}
    </div>
  )
}

/** Desktop web: header + [library | score | choir] columns. */
function DesktopRoot() {
  const [view, setView] = useState<View>('listen')
  const { openFile, score } = usePlayer()
  const { editNew } = useEditor()
  const lib = useLibrary()
  const [draft, setDraft] = useState<Draft | null>(null)
  const active = view === 'editor' ? 'listen' : view
  const { panel, library, set } = usePrefs()
  const hasSide = view === 'listen' || view === 'score'
  const showSide = hasSide && panel
  const togglePanel = () => set('panel', !panel)
  const toggleLibrary = () => set('library', !library)
  // Ctrl+B / ⌘B: options column (right). Ctrl+Alt+B / ⌘⌥B: library (left). Like Claude's sidebar.
  // e.code, not e.key: Alt changes the typed character on some layouts (macOS ⌥B = ∫).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.code !== 'KeyB') return
      e.preventDefault()
      if (e.altKey) set('library', !library); else set('panel', !panel)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel, library, set])
  const [current, setCurrent] = useState<string>()
  const open = (text: string) => { openFile(text); setCurrent(text); if (view === 'editor' || view === 'learn') setView('listen') }
  const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }
  const card: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRadius: 18, overflow: 'hidden' }
  const iconBtn = (on: boolean): React.CSSProperties => ({ width: 36, height: 36, borderRadius: 8, border: 'none', display: 'grid', placeItems: 'center', background: on ? '#E8E8ED' : 'transparent', color: '#1D1D1F' })
  const importRef = useRef<HTMLInputElement>(null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)' }}>
      <GlobalBehaviours onOpened={() => setView('listen')} />
      <header style={{ flex: 'none', height: 56, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.9)', borderBottom: '1px solid #E5E5EA' }}>
        <button type="button" onClick={toggleLibrary} aria-pressed={library} aria-controls="library-panel" style={{ ...iconBtn(library), marginLeft: -8 }}
          aria-label={library ? 'Masquer la bibliothèque (Ctrl+Alt+B)' : 'Afficher la bibliothèque (Ctrl+Alt+B)'}
          title={library ? 'Masquer la bibliothèque (Ctrl+Alt+B)' : 'Afficher la bibliothèque (Ctrl+Alt+B)'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" />{library && <path d="M6.5 9v6" />}
          </svg>
        </button>
        <span style={{ fontSize: 17, fontWeight: 800 }}>Msolfa</span>
        <nav aria-label="Navigation" style={{ display: 'flex', padding: 2, borderRadius: 10, background: '#E8E8ED' }}>
          {DESKTOP_TABS.map(t => (
            <button key={t.id} type="button" aria-current={active === t.id ? 'page' : undefined} onClick={() => setView(t.id)} style={{
              height: 30, padding: '0 14px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: active === t.id ? 600 : 500,
              background: active === t.id ? '#FFFFFF' : 'transparent', color: active === t.id ? '#1D1D1F' : '#3A3A3C',
              boxShadow: active === t.id ? '0 1px 3px rgba(0,0,0,0.1)' : undefined,
            }}>{t.label}</button>
          ))}
        </nav>
        <span style={{ flex: 1 }} />
        <input ref={importRef} type="file" accept=".msolfa,.txt,text/plain" hidden onChange={async e => {
          const f = e.target.files?.[0]; if (f) { openFile(await f.text()); setView('listen') }; e.target.value = ''
        }} />
        <button type="button" onClick={() => importRef.current?.click()} style={{ height: 34, padding: '0 14px', borderRadius: 17, border: 'none', background: '#1D1D1F', color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>Importer .msolfa</button>
        {hasSide && (
          <button type="button" onClick={togglePanel} aria-pressed={panel} aria-controls="choir-panel" style={iconBtn(panel)}
            aria-label={panel ? 'Masquer les options (Ctrl+B)' : 'Afficher les options (Ctrl+B)'} title={panel ? 'Masquer les options (Ctrl+B)' : 'Afficher les options (Ctrl+B)'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" />{panel && <path d="M17.5 9v6" />}
            </svg>
          </button>
        )}
      </header>
      {/* Floating white cards on the grey ground (16px gaps). A closed column slides to 0 — gap included — so it reopens instantly. */}
      <div style={{
        flex: 1, minHeight: 0, display: 'grid', padding: '16px 0 16px 16px', transition: 'grid-template-columns .2s ease',
        gridTemplateColumns: `${library ? 296 : 0}px minmax(0, 1fr)${hasSide ? ` ${showSide ? 316 : 0}px` : ''}`,
      }}>
        <aside id="library-panel" aria-label="Bibliothèque" aria-hidden={!library} {...({ inert: library ? undefined : '' } as object)} style={{ ...col, overflow: 'hidden' }}>
          <div style={{ width: 280, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={card}>
              <CatalogView compact activeText={score ? current : undefined} onOpen={open} onFix={d => { setDraft(d); setView('editor') }}
                onCreate={(text, id) => { openFile(text); setCurrent(text); editNew(id); setView('score') }} />
            </div>
          </div>
        </aside>
        <main style={{ ...col, paddingRight: hasSide && showSide ? 0 : 16 }}>
          <div style={{ ...col, flex: 1, paddingRight: hasSide && showSide ? 16 : 0 }}>
            {view === 'listen' && <ListenView />}
            {view === 'score' && <ScoreScreen />}
            {view === 'learn' && <MethodView />}
            {view === 'editor' && draft && (
              <GuidedEditor key={draft.id ?? draft.name} draft={draft} onCancel={() => setView('listen')} onSave={(d, text) => {
                lib.save({ id: d.id ?? newId(d.name), name: d.name, text, origin: d.origin })
                openFile(text); setView('listen')
              }} />
            )}
          </div>
        </main>
        {hasSide && (
          <aside id="choir-panel" aria-label="Chorale" aria-hidden={!showSide} {...({ inert: showSide ? undefined : '' } as object)} style={{ ...col, overflow: 'hidden' }}>
            <div style={{ width: 300, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingRight: 16 }}>
              <div style={{ ...card, flex: 'none', maxHeight: '100%' }}><ChoirPanel /></div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

const VIEW_LABEL: Record<View, string> = {
  library: 'Bibliothèque', listen: 'Écoute', score: 'Partition', choir: 'Chorale', learn: 'Apprendre', editor: 'Éditeur',
}
type NavState = { view: View; from: View | null; depth: number }

/**
 * Mobile navigation on top of the browser history: every screen change is a
 * history entry, so the phone's back button / iOS back swipe return to the
 * previous screen instead of leaving the app, and screens show a « ‹ Retour ».
 */
function useMobileNav(initial: View) {
  const [nav, setNav] = useState<NavState>(() => {
    const s = history.state as NavState | null
    return s?.view ? s : { view: initial, from: null, depth: 0 }
  })
  useEffect(() => {
    history.replaceState(nav, '')
    const onPop = (e: PopStateEvent) => setNav((e.state as NavState | null)?.view ? e.state : { view: initial, from: null, depth: 0 })
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Side effect outside the state updater: StrictMode runs updaters twice and would push two entries.
  const go = (v: View) => {
    if (v === nav.view) return
    const next = { view: v, from: nav.view, depth: nav.depth + 1 }
    history.pushState(next, '')
    setNav(next)
  }
  // Back = real history step when we pushed one, else (fresh load / deep link) to the library.
  const back = () => { if (nav.depth > 0) history.back(); else go('library') }
  return { view: nav.view, from: nav.from, go, back }
}

function MobileRoot() {
  const { view, from, go: setView, back: goBack } = useMobileNav('library')
  const { openFile } = usePlayer()
  const { editNew } = useEditor()
  const lib = useLibrary()
  const [draft, setDraft] = useState<Draft | null>(null)
  const goListen = () => setView('listen')
  const goLibrary = () => setView('library')
  const back = { label: VIEW_LABEL[from && from !== view ? from : 'library'], go: goBack }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 960, margin: '0 auto', background: 'var(--bg)' }}>
      <GlobalBehaviours onOpened={goListen} />
      <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {view === 'library' && <CatalogView onOpen={text => { openFile(text); goListen() }} onFix={d => { setDraft(d); setView('editor') }}
          onCreate={(text, id) => { openFile(text); editNew(id); setView('score') }} />}
        {view === 'editor' && draft && (
          <GuidedEditor key={draft.id ?? draft.name} draft={draft} onCancel={goBack} onSave={(d, text) => {
            lib.save({ id: d.id ?? newId(d.name), name: d.name, text, origin: d.origin })
            openFile(text); goListen()
          }} />
        )}
        {view === 'listen'  && <ListenView goLibrary={goLibrary} back={back} />}
        {view === 'score'   && <ScoreScreen goLibrary={goLibrary} goListen={goListen} back={back} />}
        {view === 'choir'   && <ChoirView goLibrary={goLibrary} back={back} />}
        {view === 'learn'   && <MethodView />}
      </main>
      {view === 'library' && <MiniBar onOpen={goListen} />}
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

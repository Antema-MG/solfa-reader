import { useEffect, useState } from 'react'
import { editModelToText } from './domain/serialize'
import { PlayerProvider, usePlayer } from './state/PlayerContext'
import { EditorProvider, useEditor } from './state/EditorContext'
import { PrefsProvider, usePrefs } from './state/PrefsContext'
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
  const { isEditing, move, apply, exit, model, docId } = useEditor()
  const lib = useLibrary()
  // A score created in the app is saved to the library on every edit: nothing to lose.
  useEffect(() => {
    if (docId && model) lib.save({ id: docId, name: model.meta.title || 'Nouvelle partition', text: editModelToText(model) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, docId])
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
        {view === 'library' && <CatalogView onOpen={text => { openFile(text); setView('listen') }} onFix={d => { setDraft(d); setView('editor') }}
          onCreate={(text, id) => { openFile(text); editNew(id); setView('score') }} />}
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
  const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, background: 'var(--bg)' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)' }}>
      <GlobalBehaviours onOpened={() => setView('listen')} />
      <header style={{ flex: 'none', height: 56, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 18, background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <button type="button" onClick={toggleLibrary} aria-pressed={library} aria-controls="library-panel"
          aria-label={library ? 'Masquer la bibliothèque (Ctrl+Alt+B)' : 'Afficher la bibliothèque (Ctrl+Alt+B)'}
          title={library ? 'Masquer la bibliothèque (Ctrl+Alt+B)' : 'Afficher la bibliothèque (Ctrl+Alt+B)'} style={{
            width: 36, height: 36, marginLeft: -8, borderRadius: 8, border: 'none', display: 'grid', placeItems: 'center',
            background: library ? 'var(--bg4)' : 'transparent', color: 'var(--text)',
          }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" />{library && <path d="M6.5 9v6" />}
          </svg>
        </button>
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
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>Espace : lecture / pause · Ctrl+Alt+B : bibliothèque · Ctrl+B : options</span>
        {hasSide && (
          <button type="button" onClick={togglePanel} aria-pressed={panel} aria-controls="choir-panel"
            aria-label={panel ? 'Masquer les options (Ctrl+B)' : 'Afficher les options (Ctrl+B)'} title={panel ? 'Masquer les options (Ctrl+B)' : 'Afficher les options (Ctrl+B)'} style={{
              width: 36, height: 36, borderRadius: 8, border: 'none', display: 'grid', placeItems: 'center',
              background: panel ? 'var(--bg4)' : 'transparent', color: 'var(--text)',
            }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" />{panel && <path d="M17.5 9v6" />}
            </svg>
          </button>
        )}
      </header>
      {/* The column slides closed (width → 0) rather than unmounting, so it reopens instantly. */}
      <div style={{
        flex: 1, minHeight: 0, display: 'grid', gap: 1, background: 'var(--border)', transition: 'grid-template-columns .2s ease',
        gridTemplateColumns: `${library ? 280 : 0}px minmax(0, 1fr)${hasSide ? ` ${showSide ? 300 : 0}px` : ''}`,
      }}>
        <aside id="library-panel" aria-label="Bibliothèque" aria-hidden={!library} {...({ inert: library ? undefined : '' } as object)}
          style={{ ...col, overflow: 'hidden' }}>
          <div style={{ width: 280, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <CatalogView compact activeText={score ? current : undefined} onOpen={open} onFix={d => { setDraft(d); setView('editor') }}
              onCreate={(text, id) => { openFile(text); setCurrent(text); editNew(id); setView('score') }} />
          </div>
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
        {hasSide && (
          <aside id="choir-panel" aria-label="Chorale" aria-hidden={!showSide} {...({ inert: showSide ? undefined : '' } as object) /* React 18 types lack `inert`: hidden column can't take focus */}
            style={{ ...col, background: 'var(--bg)', overflow: 'hidden' }}>
            <div style={{ width: 300, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}><ChoirPanel /></div>
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
        {view === 'score'   && <ScoreScreen goLibrary={goLibrary} back={back} />}
        {view === 'choir'   && <ChoirView goLibrary={goLibrary} back={back} />}
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

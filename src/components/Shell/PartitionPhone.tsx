import { useEffect, useState } from 'react'
import { usePlayer } from '../../state/PlayerContext'
import { usePrefs, type FontSize } from '../../state/PrefsContext'
import PhraseList from '../Score/PhraseList'
import RhythmToolbar from '../Editor/RhythmToolbar'
import { ReadBar, ReadToggle } from './ReadingView'
import { useEditor } from '../../state/EditorContext'
import { ACCENT, INK, IosSwitch, TEXT2, useTonicLabel } from './controls'

/** Phone portrait "Partition": title + ⋯ · phrase cards · the same slim icon row as the reading mode. */
export default function PartitionPhone({ onEdit, goListen, goLibrary }: { onEdit: () => void; goListen?: () => void; goLibrary?: () => void }) {
  const { score, tempo } = usePlayer()
  const { zoom, fontSize, lyrics, set } = usePrefs()
  const { isEditing } = useEditor()
  const tonLabel = useTonicLabel()
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    if (!menu) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [menu])

  if (!score) {
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24, color: TEXT2 }}>
        <div><p style={{ marginBottom: 12 }}>Aucune partition ouverte.</p>
          {goLibrary && <button type="button" onClick={goLibrary} style={{ height: 40, padding: '0 20px', border: 'none', borderRadius: 20, background: INK, color: '#fff', fontSize: 13, fontWeight: 700 }}>Ouvrir la bibliothèque</button>}</div>
      </div>
    )
  }
  const m = score.metadata
  const title = m.title && m.title !== '-' ? m.title : 'Sans titre'
  const step = (d: number) => set('zoom', Math.min(160, Math.max(60, zoom + d)))
  const fs = (i: FontSize, px: number) => {
    const on = fontSize === i
    return { width: 34, height: 32, borderRadius: 16, border: 'none', fontWeight: 700, fontSize: px, background: on ? INK : 'transparent', color: on ? '#FFFFFF' : INK } as const
  }
  const stepBtn = { width: 36, height: 36, border: 'none', background: 'transparent', fontSize: 18, fontWeight: 600, color: INK } as const

  return (
    <>
      <header style={{
        flex: 'none', padding: 'max(54px, calc(env(safe-area-inset-top) + 10px)) 16px 10px', background: 'rgba(245,245,247,0.96)',
        display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid #E5E5EA', position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
            <span style={{ fontSize: 12, color: TEXT2 }}>do = {tonLabel} · {m.numerator}/{m.denominator} · {tempo} BPM</span>
          </div>
          <ReadToggle />
          <button type="button" aria-label="Affichage" aria-haspopup="dialog" aria-expanded={menu} onClick={() => setMenu(o => !o)}
            style={{ flex: 'none', width: 44, height: 44, borderRadius: 22, border: 'none', background: menu ? INK : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={menu ? '#FFFFFF' : INK} aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
          </button>
        </div>
      </header>

      <PhraseList editable={isEditing} />

      {isEditing ? <RhythmToolbar /> : <ReadBar play />}

      {menu && <>
        <button type="button" aria-label="Fermer" tabIndex={-1} onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, border: 'none', background: 'transparent' }} />
        <div role="dialog" aria-label="Affichage" style={{
          position: 'absolute', top: 108, right: 12, width: 248, zIndex: 50, background: '#FFFFFF', borderRadius: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)', padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Affichage</span>
            <button type="button" aria-label="Fermer" onClick={() => setMenu(false)} style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#3A3A3C' }}>Zoom</span>
            <div role="group" aria-label="Zoom" style={{ display: 'flex', alignItems: 'center', height: 36, borderRadius: 18, background: '#F5F5F7' }}>
              <button type="button" aria-label="Dézoomer" onClick={() => step(-10)} style={stepBtn}>−</button>
              <span style={{ minWidth: 44, textAlign: 'center', fontSize: 12, fontWeight: 700 }}>{zoom} %</span>
              <button type="button" aria-label="Zoomer" onClick={() => step(10)} style={stepBtn}>+</button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#3A3A3C' }}>Taille du texte</span>
            <div role="group" aria-label="Taille du texte" style={{ display: 'flex', alignItems: 'center', height: 36, padding: 2, boxSizing: 'border-box', borderRadius: 18, background: '#F5F5F7' }}>
              {([['Petit', 12], ['Moyen', 15], ['Grand', 18]] as const).map(([l, px], i) => (
                <button key={l} type="button" aria-pressed={fontSize === i} aria-label={l} onClick={() => set('fontSize', i as FontSize)} style={fs(i as FontSize, px)}>A</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#3A3A3C' }}>Paroles</span>
            <IosSwitch on={lyrics} flip={() => set('lyrics', !lyrics)} label="Afficher les paroles" />
          </div>
          <button type="button" onClick={() => { setMenu(false); onEdit() }} style={{ height: 40, border: 'none', borderRadius: 12, background: '#F5F5F7', color: ACCENT, fontSize: 13, fontWeight: 700 }}>Éditer la partition</button>
        </div>
      </>}
    </>
  )
}

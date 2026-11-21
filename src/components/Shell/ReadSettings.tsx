import { useEffect, useState, type CSSProperties } from 'react'
import { usePlayer } from '../../state/PlayerContext'
import { usePrefs } from '../../state/PrefsContext'
import { useVoiceMix } from '../../hooks/useVoiceMix'
import { ALL_VOICES } from '../../domain/mix'
import { TONICS } from '../../domain/pitch'
import { ClefsIcon, INK, PauseIcon, PlayIcon, SpeakerIcon, TEXT2, VCOLOR, tonicName } from './controls'

const btn = (on = false): CSSProperties => ({
  flex: 'none', height: 34, minWidth: 34, padding: '0 10px', border: 'none', borderRadius: 17, fontSize: 13, fontWeight: 700,
  background: on ? INK : '#F2F2F7', color: on ? '#FFFFFF' : INK, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
})
const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, minHeight: 38 }
const cap: CSSProperties = { flex: 'none', width: 54, fontSize: 11, fontWeight: 700, color: TEXT2, letterSpacing: '0.04em', textTransform: 'uppercase' }

/**
 * Landscape, score only: two small floating buttons (⚙ réglages · ☰ commandes) and a compact
 * panel with the few settings needed while reading: zoom, BPM, key, hear the keys, who sings.
 */
export default function ReadSettings({ onShowAll }: { onShowAll: () => void }) {
  const [open, setOpen] = useState(false)
  const { tempo, setTempo, tonic, setTonic, playKey, playClefs, isPlaying, play, pause, instrumentLoading, score } = usePlayer()
  const { zoom, set } = usePrefs()
  const mix = useVoiceMix()
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open])

  const fab: CSSProperties = { width: 34, height: 34, borderRadius: 17, border: 'none', background: 'rgba(29,29,31,0.55)', color: '#FFFFFF', display: 'grid', placeItems: 'center', opacity: 0.85 }
  const stepZoom = (d: number) => set('zoom', Math.min(160, Math.max(60, zoom + d)))
  const stepTempo = (d: number) => setTempo(Math.min(240, Math.max(30, tempo + d)))
  const allOn = mix.presets.find(p => p.id === 'all')
  return (
    <>
      <div style={{ position: 'absolute', zIndex: 30, top: 6, right: 'calc(8px + env(safe-area-inset-right))', display: 'flex', gap: 6 }}>
        <button type="button" aria-label="Réglages de lecture" aria-expanded={open} title="Réglages" onClick={() => setOpen(o => !o)} style={{ ...fab, background: open ? INK : fab.background }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>
        </button>
        <button type="button" aria-label="Afficher les commandes" title="Afficher les commandes" onClick={onShowAll} style={fab}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>
      {open && <>
        <button type="button" aria-label="Fermer les réglages" tabIndex={-1} onClick={() => setOpen(false)} style={{ position: 'absolute', inset: 0, zIndex: 40, border: 'none', background: 'transparent', cursor: 'default' }} />
        <section role="dialog" aria-label="Réglages de lecture" style={{
          position: 'absolute', zIndex: 50, top: 46, right: 'calc(8px + env(safe-area-inset-right))', width: 330, maxWidth: 'calc(100vw - 24px)', maxHeight: 'calc(100dvh - 56px)', overflowY: 'auto',
          boxSizing: 'border-box', padding: '8px 12px 10px', borderRadius: 16, background: '#FFFFFF', boxShadow: '0 12px 40px rgba(0,0,0,0.22), 0 0 0 0.5px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 2, color: INK,
        }}>
          <div style={row}>
            <span style={cap}>Lecture</span>
            <button type="button" aria-label={isPlaying ? 'Pause' : 'Lecture'} disabled={!score || instrumentLoading} onClick={isPlaying ? pause : play} style={{ ...btn(true), opacity: !score || instrumentLoading ? 0.4 : 1 }}>
              {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
            </button>
          </div>
          <div style={row}>
            <span style={cap}>Zoom</span>
            <button type="button" aria-label="Dézoomer" onClick={() => stepZoom(-10)} style={btn()}>−</button>
            <span style={{ minWidth: 52, textAlign: 'center', fontSize: 13, fontWeight: 700 }}>{zoom} %</span>
            <button type="button" aria-label="Zoomer" onClick={() => stepZoom(10)} style={btn()}>+</button>
          </div>
          <div style={row}>
            <span style={cap}>Tempo</span>
            <button type="button" aria-label="Plus lent" onClick={() => stepTempo(-5)} style={btn()}>−</button>
            <span style={{ minWidth: 52, textAlign: 'center', fontSize: 13, fontWeight: 700 }}>{tempo} BPM</span>
            <button type="button" aria-label="Plus vite" onClick={() => stepTempo(5)} style={btn()}>+</button>
          </div>
          <div style={row}>
            <span style={cap}>Clé</span>
            <label style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 10px', borderRadius: 17, background: '#F2F2F7', fontSize: 13, fontWeight: 700 }}>
              <span>do =</span>
              <select aria-label="Choisir la clé" value={tonic} onChange={e => { setTonic(e.target.value); window.setTimeout(playKey, 30) }}
                style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', font: 'inherit', color: 'inherit' }}>
                {TONICS.map(([k, l]) => <option key={k} value={k}>{tonicName(l)}</option>)}
              </select>
            </label>
            <button type="button" aria-label="Écouter le do" title="Écouter le do" onClick={playKey} style={btn()}><SpeakerIcon size={16} on /></button>
            <button type="button" aria-label="Entendre les clés : S, A, T, B puis ensemble" title="Les clés : S · A · T · B puis ensemble" disabled={!score} onClick={playClefs} style={btn()}><ClefsIcon size={18} /></button>
          </div>
          <div style={row}>
            <span style={cap}>Écoute</span>
            <div role="group" aria-label="Voix qui chantent" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {ALL_VOICES.map(v => {
                const on = mix.on.includes(v)
                return (
                  <button key={v} type="button" aria-pressed={on} aria-label={`${v}${on ? ' : chante' : ' : coupée'}`} onClick={() => mix.toggle(v)} style={{
                    height: 34, minWidth: 34, padding: 0, borderRadius: 17, fontSize: 13, fontWeight: 800,
                    ...(on ? { border: 'none', background: VCOLOR[v], color: '#FFFFFF' } : { border: '1px solid #C7C7CC', background: 'transparent', color: TEXT2 }),
                    boxShadow: v === mix.myVoice ? `0 0 0 2px #FFFFFF, 0 0 0 3.5px ${VCOLOR[v]}` : undefined,
                  }}>{v}</button>
                )
              })}
              <button type="button" aria-pressed={allOn?.active} onClick={allOn?.apply} style={btn(allOn?.active)}>Tous</button>
            </div>
          </div>
          <span style={{ fontSize: 11, color: TEXT2, paddingLeft: 62 }}>Touchez une voix pour l’écouter ou la couper. Le cercle marque ma voix.</span>
        </section>
      </>}
    </>
  )
}

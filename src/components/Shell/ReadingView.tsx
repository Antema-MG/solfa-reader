import type { CSSProperties } from 'react'
import { usePlayer } from '../../state/PlayerContext'
import { usePrefs } from '../../state/PrefsContext'
import { useVoiceMix } from '../../hooks/useVoiceMix'
import { useSoundSource } from '../../hooks/useSoundSource'
import { useChants } from '../../hooks/useChants'
import { ALL_VOICES } from '../../domain/mix'
import { TONICS } from '../../domain/pitch'
import PhraseList from '../Score/PhraseList'
import { ClefsIcon, INK, PauseIcon, PianoIcon, PlayIcon, TEXT2, VCOLOR, tonicName } from './controls'

/** Corners-out icon = "score only". */
export const ReadIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
)

/** Enter reading mode (phone portrait). */
export function ReadToggle() {
  const { set } = usePrefs()
  return (
    <button type="button" aria-label="Mode lecture : partition seule" title="Mode lecture" onClick={() => set('readP', true)}
      style={{ flex: 'none', width: 44, height: 44, border: 'none', background: 'transparent', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK }}>
      <span style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(120,120,128,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ReadIcon size={18} /></span>
    </button>
  )
}

const ico: CSSProperties = { flex: 'none', minWidth: 32, height: 32, padding: '0 6px', border: 'none', borderRadius: 16, background: 'transparent', color: INK, fontSize: 14, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
const val: CSSProperties = { flex: 'none', minWidth: 34, textAlign: 'center', fontSize: 12, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums' }
const gap = <span aria-hidden="true" style={{ flex: 'none', width: 1, height: 18, background: '#E5E5EA', margin: '0 2px' }} />

/**
 * Score only + one slim row of icons, no menu: play · zoom · tempo · key · hear the keys · who sings · fold · exit.
 * Same on phone portrait and landscape.
 */
export function ReadBar({ onExit, play: withPlay = false }: { onExit?: () => void; play?: boolean }) {
  const reading = !!onExit   // reading mode: play, chant ‹ ›, fold and exit. Screens: play only.
  const { tempo, setTempo, tonic, setTonic, playKey, playClefs, isPlaying, play, pause, instrumentLoading, score } = usePlayer()
  const { zoom, readBar, set } = usePrefs()
  const mix = useVoiceMix()
  const sound = useSoundSource()
  const chants = useChants()
  const zoomBy = (d: number) => set('zoom', Math.min(160, Math.max(60, zoom + d)))
  const tempoBy = (d: number) => setTempo(Math.min(240, Math.max(30, tempo + d)))
  const i = Math.max(0, TONICS.findIndex(([k]) => k === tonic))
  const keyBy = (d: number) => { setTonic(TONICS[(i + d + TONICS.length) % TONICS.length][0]); window.setTimeout(playKey, 30) }
  const all = mix.presets.find(p => p.id === 'all')
  if (reading && !readBar) return (
    <button type="button" aria-label="Déplier la barre de lecture" aria-expanded={false} title="Déplier" onClick={() => set('readBar', true)} style={{
      flex: 'none', height: 22, border: 'none', borderTop: '1px solid #E5E5EA', background: '#FFFFFF', color: TEXT2, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
    }}><svg width="18" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg></button>
  )
  return (
    <div role="toolbar" aria-label="Lecture" style={{
      flex: 'none', background: '#FFFFFF', borderTop: '1px solid #E5E5EA', padding: '4px 6px calc(env(safe-area-inset-bottom) + 4px)',
      display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 2, rowGap: 0,
    }}>
      {(reading || withPlay) && <>
        <button type="button" aria-label={isPlaying ? 'Pause' : 'Lecture'} disabled={!score || instrumentLoading} onClick={isPlaying ? pause : play}
          style={{ ...ico, background: INK, color: '#FFFFFF', opacity: !score || instrumentLoading ? 0.4 : 1 }}>{isPlaying ? <PauseIcon size={15} /> : <PlayIcon size={15} />}</button>
        {reading && <>
        <button type="button" aria-label="Chant précédent" title="Chant précédent" disabled={chants.count < 2} onClick={() => chants.go(-1)} style={{ ...ico, opacity: chants.count < 2 ? 0.35 : 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zM20 5.5v13L9 12z" /></svg>
        </button>
        <span style={{ ...val, minWidth: 30, color: TEXT2 }} title="Chant">{chants.index >= 0 ? `${chants.index + 1}/${chants.count}` : `–/${chants.count}`}</span>
        <button type="button" aria-label="Chant suivant" title="Chant suivant" disabled={chants.count < 2} onClick={() => chants.go(1)} style={{ ...ico, opacity: chants.count < 2 ? 0.35 : 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5.5v13L15 12z" /></svg>
        </button>
        </>}
        {gap}
      </>}
      <button type="button" aria-label="Dézoomer" onClick={() => zoomBy(-10)} style={{ ...ico, fontSize: 12 }}>A−</button>
      <button type="button" aria-label="Zoomer" onClick={() => zoomBy(10)} style={{ ...ico, fontSize: 17 }}>A+</button>
      {gap}
      <button type="button" aria-label="Plus lent" onClick={() => tempoBy(-5)} style={ico}>−</button>
      <span style={val} title="BPM">♩{tempo}</span>
      <button type="button" aria-label="Plus vite" onClick={() => tempoBy(5)} style={ico}>+</button>
      {gap}
      <button type="button" aria-label="Clé précédente" onClick={() => keyBy(-1)} style={ico}>‹</button>
      <button type="button" aria-label="Écouter le do" title="Écouter le do" onClick={playKey} style={{ ...ico, minWidth: 46, fontSize: 12 }}>{tonicName(TONICS[i][1])}</button>
      <button type="button" aria-label="Clé suivante" onClick={() => keyBy(1)} style={ico}>›</button>
      <button type="button" aria-label="Entendre les clés : S, A, T, B puis ensemble" title="Les clés : S · A · T · B puis ensemble" disabled={!score} onClick={playClefs} style={ico}><ClefsIcon size={18} /></button>
      <button type="button" aria-label={sound.family === 'voice' ? 'Son : voix solfège. Toucher pour un instrument' : 'Son : instrument. Toucher pour la voix solfège'}
        title={sound.family === 'voice' ? 'Voix solfège' : 'Instrument'} onClick={() => sound.setFamily(sound.family === 'voice' ? 'instrument' : 'voice')}
        style={{ ...ico, minWidth: 40, gap: 4, background: '#F2F2F7', fontSize: 12 }}>
        {sound.family === 'voice' ? <span>Do ré</span> : <PianoIcon size={17} />}
      </button>
      {gap}
      {ALL_VOICES.map(v => {
        const on = mix.on.includes(v)
        return (
          <button key={v} type="button" aria-pressed={on} aria-label={`${v}${on ? ' : chante' : ' : coupée'}`} onClick={() => mix.toggle(v)} style={{
            ...ico, width: 30, minWidth: 30, padding: 0, fontSize: 12,
            ...(on ? { background: VCOLOR[v], color: '#FFFFFF' } : { boxShadow: 'inset 0 0 0 1.2px #C7C7CC', color: TEXT2 }),
            outline: v === mix.myVoice ? `2px solid ${VCOLOR[v]}` : undefined, outlineOffset: 1,
          }}>{v}</button>
        )
      })}
      <button type="button" aria-label="Toutes les voix" aria-pressed={all?.active} onClick={all?.apply} style={{ ...ico, fontSize: 11, color: all?.active ? INK : TEXT2 }}>Tous</button>
      {reading && <>
      {gap}
      <button type="button" aria-label="Replier la barre de lecture" aria-expanded title="Replier" onClick={() => set('readBar', false)} style={{ ...ico, color: TEXT2 }}>
        <svg width="18" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <button type="button" aria-label="Quitter le mode lecture" title="Quitter" onClick={onExit} style={{ ...ico, color: TEXT2 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      </>}
    </div>
  )
}

/** The score alone, with the slim icon row under it. */
export default function ReadingView({ dense = false, onExit }: { dense?: boolean; onExit: () => void }) {
  return (
    <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <PhraseList dense={dense} />
      <ReadBar onExit={onExit} />
    </div>
  )
}

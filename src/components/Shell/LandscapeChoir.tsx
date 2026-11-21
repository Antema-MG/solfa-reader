import { useEffect, useState, type CSSProperties } from 'react'
import type { Voice } from '../../types'
import type { InstrumentId } from '../../types/music'
import { INSTRUMENT_BY_ID } from '../../types/music'
import { usePlayer } from '../../state/PlayerContext'
import { usePrefs } from '../../state/PrefsContext'
import { useVoiceMix } from '../../hooks/useVoiceMix'
import { useSoundSource } from '../../hooks/useSoundSource'
import { loadTakes } from '../../services/recordedChoir'
import { INSTRUMENTS as INSTRUMENT_CHOICES, SHORT_SOUND } from './ui'
import { INK, KeyPill, TEXT2, TempoPill, VCOLOR, VOICES } from './controls'
import { TransportBar } from './LandscapePlayer'

const NAME: Record<Voice, string> = { S: 'Soprano', A: 'Alto', T: 'Ténor', B: 'Basse' }
const sectionCap: CSSProperties = { fontSize: 11, fontWeight: 700, color: TEXT2, letterSpacing: '0.06em' }
const short = (l: string) => l.replace(' (samples)', '')
const BARS = [0.5, 0.9, 0.6, 1, 0.7, 0.4]
/** Per-voice sound cycle (canvas order): own sound = a value the engine understands. */
const CYCLE: [string | null, string][] = [
  [null, 'Comme global'], ['recorded', 'Voix'], ['solfege', 'Do ré mi'],
  ...INSTRUMENT_CHOICES.map(id => [id, short(SHORT_SOUND[id] ?? INSTRUMENT_BY_ID[id]?.label ?? id)] as [string, string]),
]

const seg = (on: boolean): CSSProperties => ({
  height: 34, border: 'none', borderRadius: 8, padding: 0, fontSize: 12.5, color: INK, fontWeight: on ? 700 : 500, width: '100%',
  background: on ? '#FFFFFF' : 'transparent', boxShadow: on ? '0 1px 2px rgba(0,0,0,0.12)' : undefined,
})
const chip = (on: boolean): CSSProperties => ({ height: 32, border: 'none', borderRadius: 9, padding: '0 2px', fontSize: 12, fontWeight: 600, background: on ? INK : '#F2F2F7', color: on ? '#FFFFFF' : INK })

/** Phone landscape "Chorale": the mixer (ChoraleMixeur.dc.html). */
export default function LandscapeChoir({ onRecord }: { onRecord?: () => void }) {
  const { score, sung, instrumentId, setSung, setInstrument, muted, solo, toggleMute, toggleSolo, isPlaying } = usePlayer()
  const { myVoice, noMine, singers, reverb, voiceSrc, set } = usePrefs()
  const [taken, setTaken] = useState(0)
  const mix = useVoiceMix()
  const src = useSoundSource()
  useEffect(() => { void loadTakes().then(t => setTaken(Object.keys(t).length)) }, [])
  if (!score) return <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: TEXT2, padding: 24, textAlign: 'center' }}>Aucune partition ouverte — choisis-en une dans la bibliothèque.</div>

  const voices = !!sung
  const globalLabel = voices ? 'voix' : (SHORT_SOUND[instrumentId] ?? INSTRUMENT_BY_ID[instrumentId]?.label ?? instrumentId).toLowerCase()
  const audible = (v: Voice) => (solo.size ? solo.has(v) : !muted[v])
  const nAct = VOICES.filter(audible).length
  const mine = noMine ? null : myVoice
  const cycle = (v: Voice) => {
    const i = CYCLE.findIndex(([id]) => id === (voiceSrc[v] ?? null))
    const [next] = CYCLE[(i + 1) % CYCLE.length]
    const o = { ...voiceSrc }
    if (next) o[v] = next; else delete o[v]
    set('voiceSrc', o)
  }
  const labelOf = (id: string) => CYCLE.find(([k]) => k === id)?.[1] ?? id
  const mBtn = (on: boolean, bg: string): CSSProperties => ({ height: 40, border: 'none', borderRadius: 10, padding: 0, fontSize: 14, fontWeight: 800, background: on ? bg : '#F2F2F7', color: on ? '#FFFFFF' : INK })

  return (
    <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <style>{'@keyframes lv{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}@media (prefers-reduced-motion: reduce){.lv{animation:none!important}}'}</style>
      <header style={{ flex: 'none', height: 50, boxSizing: 'border-box', padding: '0 12px 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Chorale · mixeur</h1>
          <span style={{ fontSize: 11, color: TEXT2, whiteSpace: 'nowrap' }}>{nAct} pupitre{nAct > 1 ? 's' : ''} actif{nAct > 1 ? 's' : ''} · son : {globalLabel}</span>
        </div>
        <KeyPill /><TempoPill />
        {onRecord && <button type="button" onClick={onRecord} style={{ flex: 'none', width: 112, height: 40, border: 'none', borderRadius: 12, background: INK, color: '#FFFFFF', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true"><circle cx="12" cy="12" r="7" /></svg>Enregistrer</button>}
      </header>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 8, padding: '0 12px 0' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ flex: 'none', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
            {VOICES.map(v => {
              const on = audible(v), m = !!muted[v], s = solo.has(v), me = mine === v, own = voiceSrc[v] ?? null
              return (
                <section key={v} style={{ background: '#FFFFFF', borderRadius: 14, padding: 8, display: 'flex', flexDirection: 'column', gap: 6, boxShadow: me ? `0 0 0 2px ${VCOLOR[v]}` : undefined, opacity: on ? 1 : 0.65 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ flex: 'none', width: 26, height: 26, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#FFFFFF', background: VCOLOR[v] }}>{v}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{NAME[v]}</span>
                    <button type="button" aria-pressed={me} aria-label={`C’est ma voix : ${NAME[v].toLowerCase()}`}
                      onClick={() => { if (me) set('noMine', true); else { set('myVoice', v); set('noMine', false) } }}
                      style={{ flex: 'none', width: 26, height: 26, border: 'none', borderRadius: 8, padding: 0, fontSize: 12, fontWeight: 800, background: me ? VCOLOR[v] : '#F2F2F7', color: me ? '#FFFFFF' : INK }}>★</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: 58 }}>
                    {BARS.map((h, i) => (
                      <span key={i} className="lv" style={{
                        flex: 'none', width: 8, height: Math.round(h * 56), borderRadius: 4, background: on ? VCOLOR[v] : '#D1D1D6', transformOrigin: 'bottom',
                        ...(isPlaying && on ? { animation: `lv .6s ease-in-out ${i * 0.09}s infinite` } : { opacity: on ? 0.9 : 0.5 }),
                      }} />
                    ))}
                  </div>
                  <button type="button" onClick={() => cycle(v)} aria-label={`Son de ${NAME[v].toLowerCase()} : toucher pour changer`} style={{
                    height: 42, border: 'none', borderRadius: 10, padding: '0 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: own ? '#FFF6E3' : '#F2F2F7', color: own ? '#85632A' : INK,
                  }}><span style={{ fontSize: 12.5, fontWeight: 700 }}>{own ? labelOf(own) : 'Comme global'}</span><span style={{ fontSize: 10.5, opacity: 0.7 }}>{own ? 'son propre' : globalLabel.replace(/^./, c => c.toUpperCase())}</span></button>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
                    <button type="button" aria-pressed={m} aria-label={`Couper ${NAME[v].toLowerCase()}`} onClick={() => toggleMute(v)} style={mBtn(m, '#B3261E')}>M</button>
                    <button type="button" aria-pressed={s} aria-label={`Solo ${NAME[v].toLowerCase()}`} onClick={() => toggleSolo(v)} style={mBtn(s, '#8A4C08')}>S</button>
                  </div>
                </section>
              )
            })}
          </div>
          <section style={{ flex: 'none', borderRadius: 14, background: '#FFFFFF', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div role="radiogroup" aria-label="Qui chante" style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: `repeat(${mix.presets.length}, minmax(0, 1fr))`, gap: 2, padding: 2, borderRadius: 10, background: '#F2F2F7' }}>
              {mix.presets.map(p => <button key={p.id} type="button" role="radio" aria-checked={p.active} onClick={p.apply} style={seg(p.active)}>{p.label}</button>)}
            </div>
          </section>
        </div>

        <aside style={{ flex: 'none', width: 212, boxSizing: 'border-box', borderRadius: 14, background: '#FFFFFF', padding: 10, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={sectionCap}>SON DE DÉPART</span>
          <div role="radiogroup" aria-label="Voix ou instruments" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2, padding: 2, borderRadius: 10, background: '#F2F2F7' }}>
            <button type="button" role="radio" aria-checked={voices} onClick={() => src.setFamily('voice')} style={seg(voices)}>Voix</button>
            <button type="button" role="radio" aria-checked={!voices} onClick={() => src.setFamily('instrument')} style={seg(!voices)}>Instruments</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4 }}>
            {voices
              ? ([['recorded', 'Vraies voix'], ['solfege', 'Do ré mi'], ['a', 'Ah']] as const).map(([id, l]) => <button key={id} type="button" aria-pressed={sung === id} onClick={() => setSung(id)} style={chip(sung === id)}>{l}</button>)
              : INSTRUMENT_CHOICES.map((id: InstrumentId) => <button key={id} type="button" aria-pressed={instrumentId === id} onClick={() => setInstrument(id)} style={chip(instrumentId === id)}>{short(SHORT_SOUND[id] ?? INSTRUMENT_BY_ID[id]?.label ?? id)}</button>)}
          </div>
          <span style={{ ...sectionCap, paddingTop: 4 }}>LE CHŒUR</span>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600 }}><span>Chanteurs par pupitre</span><span style={{ color: TEXT2 }}>{singers}</span></span>
            <input type="range" min={1} max={6} value={singers} onChange={e => set('singers', +e.target.value)} style={{ width: '100%', height: 28, margin: 0, accentColor: '#85632A' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600 }}><span>Réverbération</span><span style={{ color: TEXT2 }}>{reverb} %</span></span>
            <input type="range" min={0} max={100} value={reverb} onChange={e => set('reverb', +e.target.value)} style={{ width: '100%', height: 28, margin: 0, accentColor: '#85632A' }} />
          </label>
          <button type="button" onClick={onRecord} disabled={!onRecord} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '2px 0 0', border: 'none', background: 'transparent', color: INK, textAlign: 'left' }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 12, fontWeight: 700 }}><span>Voix enregistrées</span><span>{taken} / 28 ›</span></span>
            <span style={{ display: 'block', width: '100%', height: 6, borderRadius: 3, background: '#E8E8ED', overflow: 'hidden' }}><span style={{ display: 'block', width: `${(taken / 28) * 100}%`, height: 6, background: '#85632A' }} /></span>
          </button>
        </aside>
      </div>
      <TransportBar />
    </div>
  )
}

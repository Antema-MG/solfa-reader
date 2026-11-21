import { useState, type CSSProperties } from 'react'
import { useSoundSource } from '../../hooks/useSoundSource'
import { useVoiceMix } from '../../hooks/useVoiceMix'
import { ALL_VOICES } from '../../domain/mix'
import { INK, PickerSheet, TEXT2, VCOLOR } from './controls'

const NAMES = { S: 'Soprano', A: 'Alto', T: 'Ténor', B: 'Basse' }
const arrow: CSSProperties = { flex: 'none', width: 30, height: 34, border: 'none', background: 'transparent', color: TEXT2, fontSize: 20, lineHeight: 1, padding: 0 }

/** Voix | Instrument in one tap, then ‹ sound › to hop through the sounds of that family. */
export function SoundBar() {
  const s = useSoundSource()
  const [open, setOpen] = useState(false)
  const seg = (on: boolean): CSSProperties => ({
    height: 30, border: 'none', borderRadius: 8, padding: '0 10px', fontSize: 12.5, fontWeight: on ? 700 : 500, whiteSpace: 'nowrap',
    background: on ? '#FFFFFF' : 'transparent', color: INK, boxShadow: on ? '0 1px 3px rgba(0,0,0,0.16)' : undefined,
  })
  return (
    <div role="group" aria-label="Son" style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
      <div role="radiogroup" aria-label="Source du son" style={{ flex: 'none', display: 'flex', padding: 2, borderRadius: 10, background: '#E8E8ED' }}>
        <button type="button" role="radio" aria-checked={s.family === 'voice'} onClick={() => s.setFamily('voice')} style={seg(s.family === 'voice')}>Voix</button>
        <button type="button" role="radio" aria-checked={s.family === 'instrument'} onClick={() => s.setFamily('instrument')} style={seg(s.family === 'instrument')}>Instrument</button>
      </div>
      <button type="button" aria-label="Son précédent" onClick={() => s.step(-1)} style={arrow}>‹</button>
      <button type="button" aria-label="Choisir le son" aria-haspopup="dialog" onClick={() => setOpen(true)}
        style={{ flex: 1, minWidth: 0, height: 34, border: 'none', borderRadius: 17, background: '#F5F5F7', color: INK, fontSize: 12.5, fontWeight: 600, padding: '0 10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</button>
      <button type="button" aria-label="Son suivant" onClick={() => s.step(1)} style={arrow}>›</button>
      {open && <PickerSheet title={s.family === 'voice' ? 'VOIX' : 'INSTRUMENT'} onClose={() => setOpen(false)}
        options={s.list.map(o => ({ value: o.id, label: o.label, on: o.id === s.current }))} onPick={v => { s.set(v); setOpen(false) }} />}
    </div>
  )
}

/** Who sings: S A T B toggles (tap = in / out) and a preset menu (Tous · S · A · T · B · Ma voix seule · Sans ma voix). */
export function VoiceMixBar({ padding = '0 16px 8px' }: { padding?: string }) {
  const m = useVoiceMix()
  const [open, setOpen] = useState(false)
  return (
    <div role="group" aria-label="Voix qui chantent" style={{ flex: 'none', padding, display: 'flex', gap: 6, alignItems: 'center' }}>
      {ALL_VOICES.map(v => {
        const on = m.on.includes(v)
        return (
          <button key={v} type="button" aria-pressed={on} aria-label={`${NAMES[v]}${on ? ' : chante' : ' : coupée'}${v === m.myVoice ? ' (ma voix)' : ''}`} onClick={() => m.toggle(v)} style={{
            height: 30, minWidth: 34, padding: '0 10px', borderRadius: 15, fontSize: 12.5, fontWeight: 700,
            ...(on ? { border: 'none', background: VCOLOR[v], color: '#FFFFFF' } : { border: '1px solid #C7C7CC', background: 'transparent', color: TEXT2 }),
            boxShadow: v === m.myVoice ? `0 0 0 2px #FFFFFF, 0 0 0 3.5px ${VCOLOR[v]}` : undefined,
          }}>{v}</button>
        )
      })}
      <button type="button" aria-haspopup="dialog" aria-label="Choisir qui chante" onClick={() => setOpen(true)}
        style={{ marginLeft: 'auto', height: 30, padding: '0 12px', border: 'none', borderRadius: 15, background: '#F5F5F7', color: INK, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{m.label} ⌄</button>
      {open && <PickerSheet title="QUI CHANTE" onClose={() => setOpen(false)}
        options={m.presets.map(p => ({ value: p.id, label: p.label, on: p.active }))} onPick={id => { m.presets.find(p => p.id === id)?.apply(); setOpen(false) }} />}
    </div>
  )
}

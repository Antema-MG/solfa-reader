import { useEffect, useState } from 'react'
import { TONICS } from '../../domain/pitch'
import { METERS, newScoreText, type Meter } from '../../domain/newScore'
import { useMouse } from '../Shell/ui'

function Stepper({ value, set, min, max, step = 1, label }: { value: number; set: (v: number) => void; min: number; max: number; step?: number; label: string }) {
  return (
    <span className="ios-stepper">
      <button type="button" aria-label={`${label} moins`} disabled={value <= min} onClick={() => set(Math.max(min, value - step))}>−</button><i />
      <button type="button" aria-label={`${label} plus`} disabled={value >= max} onClick={() => set(Math.min(max, value + step))}>+</button>
    </span>
  )
}

/** One measure drawn as its beats, so the chosen metre is seen, not just read. */
function MeasurePreview({ meter }: { meter: Meter }) {
  const compound = meter.den === 8 // 6/8: two groups of three
  return (
    <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {Array.from({ length: meter.num }, (_, i) => (
        <span key={i} style={{ display: 'contents' }}>
          {i > 0 && <span style={{ width: compound && i % 3 === 0 ? 10 : 2 }} />}
          <span style={{
            width: 26, height: 26, borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600,
            background: i === 0 || (compound && i % 3 === 0) ? 'var(--text)' : 'var(--fill)', color: i === 0 || (compound && i % 3 === 0) ? 'var(--bg2)' : 'var(--text2)',
          }}>{i + 1}</span>
        </span>
      ))}
    </div>
  )
}

const input: React.CSSProperties = {
  flex: 1, minWidth: 0, border: 'none', background: 'transparent', textAlign: 'right', fontSize: 15, color: 'var(--text)', outline: 'none',
}

/**
 * "Nouvelle partition": a few choices, then the cell editor opens with every
 * measure already cut into the right number of beats for the chosen metre.
 * Bottom sheet on phones, centred card on the web.
 */
export default function NewScoreSheet({ onClose, onCreate }: { onClose: () => void; onCreate: (text: string, title: string) => void }) {
  const wide = useMouse()   // mouse: centred card; touch: bottom sheet
  const [title, setTitle] = useState('')
  const [composer, setComposer] = useState('')
  const [key, setKey] = useState('C')
  const [meter, setMeter] = useState<Meter>(METERS[0])
  const [tempo, setTempo] = useState(80)
  const [phrases, setPhrases] = useState(2)
  const [measures, setMeasures] = useState(4)
  const create = () => onCreate(newScoreText({ title, composer, key, meter, tempo, phrases, measuresPerPhrase: measures }), title.trim() || 'Nouvelle partition')

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const total = phrases * measures
  const bar: React.CSSProperties = { border: 'none', background: 'none', fontSize: 16, padding: '0 4px', height: 44, color: 'var(--accent-ink)' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: wide ? 'center' : 'flex-end', alignItems: 'center', background: 'rgba(0,0,0,.35)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form role="dialog" aria-label="Nouvelle partition" onSubmit={e => { e.preventDefault(); create() }} style={{
        width: wide ? 520 : '100%', maxHeight: wide ? 'calc(100dvh - 48px)' : 'calc(100dvh - 24px)', overflowY: 'auto',
        background: 'var(--bg3)', borderRadius: wide ? 14 : '14px 14px 0 0', padding: `0 16px ${wide ? 16 : 'max(16px, env(safe-area-inset-bottom))'}`,
        boxShadow: '0 20px 60px rgba(0,0,0,.25)', display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* iOS sheet bar: Annuler · title · Créer */}
        <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg3)', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', margin: '0 -16px', padding: '6px 12px 0' }}>
          <button type="button" onClick={onClose} style={{ ...bar, justifySelf: 'start' }}>Annuler</button>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Nouvelle partition</span>
          <button type="submit" style={{ ...bar, justifySelf: 'end', fontWeight: 600 }}>Créer</button>
        </div>

        <div className="ios-group">
          <label className="ios-row"><span style={{ flex: 'none' }}>Titre</span>
            <input autoFocus={wide} value={title} onChange={e => setTitle(e.target.value)} placeholder="Sans titre" style={input} /></label>
          <label className="ios-row"><span style={{ flex: 'none' }}>Compositeur</span>
            <input value={composer} onChange={e => setComposer(e.target.value)} placeholder="Facultatif" style={input} /></label>
        </div>

        <div>
          <div className="ios-caption">Mesure</div>
          <div className="ios-group">
            <div className="ios-row stack">
              <div role="radiogroup" aria-label="Mesure" className="ios-seg">
                {METERS.map(m => <button key={m.label} type="button" role="radio" aria-checked={meter === m} onClick={() => setMeter(m)}>{m.label}</button>)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <MeasurePreview meter={meter} />
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>{meter.hint}</span>
              </div>
            </div>
            <label className="ios-row"><span style={{ flex: 'none' }}>Tonalité (do =)</span>
              <select value={key} onChange={e => setKey(e.target.value)} style={{ flex: 1 }}>
                {TONICS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select></label>
            <div className="ios-row"><span style={{ flex: 1 }}>Tempo</span><span className="value">{tempo}</span>
              <Stepper value={tempo} set={setTempo} min={30} max={240} step={5} label="Tempo" /></div>
          </div>
        </div>

        <div>
          <div className="ios-caption">Taille</div>
          <div className="ios-group">
            <div className="ios-row"><span style={{ flex: 1 }}>Phrases</span><span className="value">{phrases}</span>
              <Stepper value={phrases} set={setPhrases} min={1} max={24} label="Phrases" /></div>
            <div className="ios-row"><span style={{ flex: 1 }}>Mesures par phrase</span><span className="value">{measures}</span>
              <Stepper value={measures} set={setMeasures} min={1} max={16} label="Mesures par phrase" /></div>
          </div>
          <div className="ios-caption" style={{ padding: '6px 16px 0' }}>
            {total} mesure{total > 1 ? 's' : ''} de {meter.num} cases pour chaque voix (S, A, T, B).
          </div>
        </div>

        {!wide && (
          <button type="submit" style={{ height: 50, borderRadius: 12, border: 'none', background: 'var(--text)', color: 'var(--bg2)', fontSize: 17, fontWeight: 600 }}>
            Créer et remplir les cases
          </button>
        )}
      </form>
    </div>
  )
}

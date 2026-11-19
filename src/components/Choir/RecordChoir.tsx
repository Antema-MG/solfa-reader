import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Icon } from '../Shell/Icon'
import type { Voice } from '../../types'
import { usePlayer } from '../../state/PlayerContext'
import { NAMES_SHARP, VOICE_BASE_OCTAVE, degreeToMidi } from '../../domain/pitch'
import { syllableFor } from '../../domain/choir'
import { ChoirSynth } from '../../services/choirSynth'
import {
  DEGREES, SYL_NAME, RECORD_SECONDS, analyseTake, deleteTake, exportTakes, importTakes, loadTakes, protectStorage, recordMic, saveTake, takeKey,
  type Take, type Takes,
} from '../../services/recordedChoir'

const VOICES: Voice[] = ['S', 'A', 'T', 'B']
const COLOR: Record<Voice, string> = { S: 'var(--s)', A: 'var(--a)', T: 'var(--t)', B: 'var(--b)' }
const NAME: Record<Voice, string> = { S: 'Soprano', A: 'Alto', T: 'Ténor', B: 'Basse' }
const RANGE: Record<Voice, string> = { S: 'Do4 et Do5', A: 'La3 et La4', T: 'Do3 et Do4', B: 'Fa2 et Fa3' }
const RED = 'var(--red-btn, #d93f3f)'

const noteName = (midi: number) => { const m = Math.round(midi); return `${NAMES_SHARP[m % 12]}${Math.floor(m / 12) - 1}` }
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function preview(t: Take) {
  const ctx = new AudioContext()
  const buf = ctx.createBuffer(1, t.pcm.length, t.rate)
  buf.getChannelData(0).set(t.pcm)
  const src = ctx.createBufferSource()
  src.buffer = buf; src.connect(ctx.destination); src.start()
  src.onended = () => void ctx.close()
}

/** The synthesised voice sings the syllable once, as a model to imitate. */
function playModel(voice: Voice, deg: string, midi: number) {
  const ctx = new AudioContext()
  const c = new ChoirSynth(ctx, ctx.destination)
  c.setFx({ singers: 1, reverb: 15 })
  c.sing(voice, 440 * Math.pow(2, (midi - 69) / 12), syllableFor('solfege', deg), ctx.currentTime + 0.1, 1.8)
  setTimeout(() => void ctx.close(), 3500)
}

type Phase = 'idle' | 'count' | 'rec' | 'busy'

/**
 * Record one sung syllable per section (S/A/T/B × do…si). One syllable on
 * stage at a time: listen to the model, press the red button (or Space), sing.
 */
export default function RecordChoir({ onClose }: { onClose: () => void }) {
  const { setTakes, tonic } = usePlayer()
  const [takes, setLocal] = useState<Takes>({})
  const [voice, setVoice] = useState<Voice>('S')
  const [deg, setDeg] = useState<string>('d')
  const [phase, setPhase] = useState<Phase>('idle')
  const [count, setCount] = useState(3)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [safe, setSafe] = useState(true)
  /** Last change (new take or deletion), undoable: `take` is what was there before. */
  const [undo, setUndo] = useState<{ voice: Voice; deg: string; take: Take | null; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = () => loadTakes().then(t => { setLocal(t); setTakes(t) })
  useEffect(() => { void refresh(); void protectStorage().then(setSafe) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const key = takeKey(voice, deg)
  const cur = takes[key]
  const total = Object.keys(takes).length
  const target = degreeToMidi(deg, '', 0, tonic, VOICE_BASE_OCTAVE[voice])
  const idle = phase === 'idle'
  const step = (d: number) => setDeg(DEGREES[(DEGREES.indexOf(deg as typeof DEGREES[number]) + d + 7) % 7])

  const record = async () => {
    if (!idle) return
    setError(null); setNote(null)
    const before = cur ?? null, v = voice, d = deg
    for (let n = 3; n > 0; n--) { setCount(n); setPhase('count'); await sleep(550) }
    setPhase('rec')
    try {
      const { pcm, rate } = await recordMic(RECORD_SECONDS, setLevel)
      setPhase('busy')
      const take = analyseTake(pcm, rate)
      await saveTake(takeKey(v, d), take)
      await refresh()
      preview(take)
      setUndo({ voice: v, deg: d, take: before, text: `« ${SYL_NAME[d]} » ${NAME[v].toLowerCase()} enregistré (${noteName(take.midi)})` })
      if (d !== 't') step(1)
    } catch (e) {
      setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Le micro est bloqué. Autorise-le dans le navigateur.' : (e as Error).message)
    } finally { setPhase('idle'); setLevel(0) }
  }

  const remove = async () => {
    if (!cur || !confirm(`Supprimer « ${SYL_NAME[deg]} » (${NAME[voice]}) ?`)) return
    setUndo({ voice, deg, take: cur, text: `« ${SYL_NAME[deg]} » ${NAME[voice].toLowerCase()} supprimé` })
    await deleteTake(key); await refresh()
  }
  const revert = async () => {
    if (!undo) return
    const k = takeKey(undo.voice, undo.deg)
    if (undo.take) await saveTake(k, undo.take); else await deleteTake(k)
    setVoice(undo.voice); setDeg(undo.deg); setUndo(null); await refresh()
  }

  const backup = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(exportTakes(takes))
    a.download = `choeur-${new Date().toISOString().slice(0, 10)}.choeur`
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const restore = async (f?: File) => {
    if (!f) return
    setError(null)
    try { const n = await importTakes(f); await refresh(); setNote(`${n} syllabes restaurées.`) }
    catch (e) { setError((e as Error).message) }
  }

  // Keyboard: Space record · M model · ←/→ syllable · Esc close.
  // Capture + stopImmediatePropagation so Space doesn't also start the score.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      const act = (fn: () => void) => { e.preventDefault(); e.stopImmediatePropagation(); fn() }
      if (e.key === ' ') act(() => void record())               // Enter keeps its native meaning on the focused button
      else if (e.key === 'Escape' && idle) act(onClose)
      else if (!idle) return
      else if (e.key.toLowerCase() === 'm') act(() => playModel(voice, deg, target))
      else if (e.key === 'ArrowRight') act(() => step(1))
      else if (e.key === 'ArrowLeft') act(() => step(-1))
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  })

  const pill = (_strong = false): CSSProperties => ({
    height: 36, padding: '0 14px', borderRadius: 18, border: 'none', display: 'inline-flex', alignItems: 'center', gap: 7,
    background: 'var(--bg2)', color: 'var(--text)', fontSize: 14, fontWeight: 500,
  })
  const link: CSSProperties = { border: 'none', background: 'none', padding: 0, color: 'var(--accent-ink)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.4)', padding: 8 }}>
      <div role="dialog" aria-modal="true" aria-label="Enregistrer les voix" style={{
        width: 'min(560px, 100%)', maxHeight: 'calc(100dvh - 16px)', overflowY: 'auto', background: 'var(--bg2)', borderRadius: 16,
        padding: '14px 18px 16px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 20px 60px rgba(0,0,0,.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <b style={{ fontSize: 16, flex: 1 }}>Enregistrer les voix</b>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{total} / 28</span>
          <button type="button" aria-label="Fermer" disabled={!idle} onClick={onClose} style={{ width: 30, height: 30, borderRadius: 15, border: 'none', background: 'var(--fill)', color: 'var(--text2)', display: 'grid', placeItems: 'center' }}><Icon name="close" size={14} /></button>
        </div>

        {/* section */}
        <div role="tablist" aria-label="Pupitre" style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {VOICES.map(v => {
            const n = DEGREES.filter(d => takes[takeKey(v, d)]).length, on = voice === v
            return (
              <button key={v} type="button" role="tab" aria-selected={on} disabled={!idle} onClick={() => setVoice(v)} style={{
                flex: 1, height: 42, border: 'none', background: 'none', marginBottom: -1, fontSize: 14, fontWeight: on ? 700 : 500,
                color: on ? COLOR[v] : 'var(--text2)', borderBottom: `2.5px solid ${on ? COLOR[v] : 'transparent'}`,
              }}>{NAME[v]} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)' }}>{n}/7</span></button>
            )
          })}
        </div>

        {/* syllables */}
        <div className="ios-seg">
          {DEGREES.map(d => {
            const t = takes[takeKey(voice, d)], on = d === deg
            return (
              <button key={d} type="button" aria-pressed={on} disabled={!idle} title={t ? `Enregistré · ${noteName(t.midi)}` : 'Pas encore enregistré'}
                onClick={() => setDeg(d)} style={{
                  height: 44, fontSize: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}>
                {SYL_NAME[d]}
                <span aria-hidden style={{ width: 6, height: 6, borderRadius: 3, background: t ? COLOR[voice] : 'var(--border2)' }} />
              </button>
            )
          })}
        </div>

        {/* stage: the one syllable being recorded */}
        <div style={{ background: 'var(--bg3)', borderRadius: 14, padding: '18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: COLOR[voice] }}>{SYL_NAME[deg]}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>{NAME[voice]} · note conseillée {noteName(target)}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button type="button" disabled={!idle} onClick={() => playModel(voice, deg, target)} style={pill(true)}><Icon name="speaker" size={16} />Modèle</button>
            <button type="button" aria-label={cur ? 'Refaire l’enregistrement' : 'Enregistrer'} disabled={!idle} onClick={() => void record()} style={{
              width: 68, height: 68, borderRadius: 34, border: `3px solid ${RED}`, background: 'var(--bg2)', display: 'grid', placeItems: 'center', padding: 0,
            }}>
              {phase === 'count'
                ? <span style={{ fontSize: 26, fontWeight: 800, color: RED }}>{count}</span>
                : <span style={{ width: phase === 'rec' ? 22 : 44, height: phase === 'rec' ? 22 : 44, borderRadius: phase === 'rec' ? 5 : 22, background: RED, transition: 'all .15s' }} />}
            </button>
            <button type="button" disabled={!idle || !cur} onClick={() => cur && preview(cur)} style={{ ...pill(true), opacity: cur ? 1 : 0.4 }}>
              <Icon name="play" size={14} />Réécouter
            </button>
          </div>

          <div aria-live="polite" style={{ minHeight: 20, fontSize: 13, color: 'var(--text2)', textAlign: 'center', width: '100%' }}>
            {phase === 'idle' && !cur && <>Appuie sur le bouton rouge, puis chante « {SYL_NAME[deg]} » environ 2 secondes.</>}
            {phase === 'idle' && cur && <>Enregistré ({noteName(cur.midi)}). Appuie sur le bouton rouge pour refaire, ou <button type="button" onClick={remove} style={link}>supprimer</button>.</>}
            {phase === 'count' && <>Prépare-toi…</>}
            {phase === 'rec' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 300, margin: '0 auto' }}>
                <span style={{ color: RED, fontWeight: 700 }}>Chante</span>
                <span style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg4)', overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', width: `${Math.round(level * 100)}%`, background: level > 0.9 ? RED : 'var(--green, #2a9d5c)' }} />
                </span>
              </div>
            )}
            {phase === 'busy' && <>Analyse…</>}
          </div>
        </div>

        {undo && idle && (
          <div style={{ fontSize: 13, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ flex: 1, color: 'var(--text2)' }}>{undo.text}.</span>
            <button type="button" onClick={revert} style={link}>Annuler</button>
          </div>
        )}
        {error && <div role="alert" style={{ fontSize: 13, color: RED, fontWeight: 600 }}>{error}</div>}
        {note && <div role="status" style={{ fontSize: 13, color: 'var(--text2)' }}>{note}</div>}

        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
          {NAME[voice]} : chante entre {RANGE[voice]}, au calme, casque conseillé.
          <span style={{ display: 'block' }}>Espace : enregistrer · M : modèle · ← → : syllabe</span>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 12, color: 'var(--text2)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 14px' }}>
          <span style={{ flex: 1, minWidth: 200 }}>
            Gardées dans ce navigateur{safe ? '' : ', qui peut les effacer'}. Pour un autre appareil ou un autre lien, passe par un fichier.
          </span>
          <button type="button" disabled={!total} onClick={backup} style={{ ...link, opacity: total ? 1 : 0.4 }}>Sauvegarder</button>
          <button type="button" onClick={() => fileRef.current?.click()} style={link}>Restaurer</button>
          <input ref={fileRef} type="file" accept=".choeur,application/octet-stream" hidden onChange={e => { void restore(e.target.files?.[0]); e.target.value = '' }} />
        </div>
      </div>
    </div>
  )
}

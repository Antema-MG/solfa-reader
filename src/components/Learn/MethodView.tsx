import { useEffect, useRef } from 'react'
import abcjs from 'abcjs'
import { useMethod } from '../../hooks/useMethod'
import { lessonToAbc } from '../../domain/method'
import { midiToFrenchName } from '../../domain/pitch'
import Keyboard from '../Keyboard/Keyboard'

const HAND_LABEL = { R: 'MD', L: 'MG' } as const

const pill = (bg: string): React.CSSProperties => ({
  border: 'none', borderRadius: 999, padding: '10px 18px',
  fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#0f0f12', background: bg,
})

export default function MethodView() {
  const M = useMethod()
  const staffRef = useRef<HTMLDivElement>(null)

  // Engrave the real staff whenever the lesson changes.
  useEffect(() => {
    if (staffRef.current) abcjs.renderAbc(staffRef.current, lessonToAbc(M.lesson), {
      add_classes: true, staffwidth: 480, scale: 1.5, paddingtop: 6, paddingbottom: 6,
    })
  }, [M.lesson])

  // Colour notes by progress: done = green, current = red, upcoming = black.
  useEffect(() => {
    const notes = staffRef.current?.querySelectorAll<SVGElement>('.abcjs-note')
    notes?.forEach((el, i) => {
      el.style.fill = i < M.noteIdx ? '#0a9d6b' : i === M.noteIdx ? '#e23b3b' : '#1a1a1a'
    })
  }, [M.noteIdx, M.lessonIdx])

  return (
    <div style={{
      flex: 1, overflowY: 'auto', padding: '18px 16px 36px',
      background: 'radial-gradient(1100px 460px at 50% -10%, rgba(11,232,129,0.10), transparent), var(--bg)',
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Lesson chips (no locks) */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {M.lessons.map((ls, i) => {
            const active = i === M.lessonIdx
            return (
              <button key={ls.id} type="button" onClick={() => M.selectLesson(i)} title={ls.title}
                style={{
                  border: '1px solid var(--border2)', borderRadius: 999, padding: '6px 12px',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: active ? 'var(--accent)' : 'var(--bg4)',
                  color: active ? '#0f0f12' : 'var(--text2)',
                }}>{i + 1}</button>
            )
          })}
        </div>

        {/* Lesson header */}
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{M.lesson.title}</h2>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text2)', marginTop: 8 }}>{M.lesson.hint}</p>
        </div>

        {/* Real engraved staff, on "paper" */}
        <div style={{
          background: '#fbf7ec', borderRadius: 12, padding: '8px 14px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.35)', overflowX: 'auto',
        }}>
          <div ref={staffRef} />
        </div>

        {/* Status / feedback */}
        <div style={{ minHeight: 24, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {M.completed ? (
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0be881' }}>🎉 Leçon réussie !</span>
          ) : (
            <span style={{ fontSize: 14, color: 'var(--text2)' }}>
              Joue : <b style={{ color: 'var(--text)' }}>{midiToFrenchName(M.expected!, 'C')}</b>
              {' '}(doigt {M.lesson.exercise[M.noteIdx].finger}, {HAND_LABEL[M.lesson.exercise[M.noteIdx].hand]})
            </span>
          )}
          {M.wrong && !M.completed && <span style={{ color: '#ff6b6b', fontSize: 13 }}>✗ pas la bonne note</span>}
        </div>

        {/* Mic status */}
        {M.micOn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>🎤 J’entends :</span>
            <b style={{ fontSize: 15, color: M.detected ? 'var(--accent)' : 'var(--text3)', minWidth: 40 }}>
              {M.detected ? midiToFrenchName(M.detected.midi, 'C') : '—'}
            </b>
            <div style={{ width: 120, height: 6, background: 'var(--bg4)', borderRadius: 999, position: 'relative' }}>
              <div style={{ position: 'absolute', left: '50%', top: -3, width: 1, height: 12, background: 'var(--text3)' }} />
              {M.detected && (
                <div style={{
                  position: 'absolute', top: -2, width: 10, height: 10, borderRadius: 999, background: 'var(--accent)',
                  left: `calc(${50 + Math.max(-50, Math.min(50, M.detected.cents))}% - 5px)`,
                }} />
              )}
            </div>
          </div>
        )}
        {M.micError && <span style={{ fontSize: 13, color: '#ff6b6b' }}>{M.micError}</span>}

        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={M.playModel} style={pill('linear-gradient(90deg,#34e7e4,#0be881)')}>
            ▶ Écouter le modèle
          </button>
          <button type="button" onClick={M.toggleMic}
            style={pill(M.micOn ? 'linear-gradient(90deg,#ff6b6b,#ff9f43)' : 'var(--bg4)')}>
            <span style={{ color: M.micOn ? '#0f0f12' : 'var(--text)' }}>{M.micOn ? '⏹ Couper le micro' : '🎤 Activer le micro'}</span>
          </button>
          {M.completed && M.lessonIdx < M.lessons.length - 1 && (
            <button type="button" onClick={M.nextLesson} style={pill('linear-gradient(90deg,#7b61ff,#a55eea)')}>
              <span style={{ color: '#fff' }}>Leçon suivante →</span>
            </button>
          )}
        </div>

        {/* Reused keyboard — target lit, click validates */}
        <div style={{ overflowX: 'auto', paddingBottom: 6 }}>
          <Keyboard
            variant="piano"
            tonic="C"
            showNames
            litMidis={M.expected == null ? {} : { S: M.expected }}
            onPress={M.pressKey}
          />
        </div>
        <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: -4 }}>
          Clique la touche allumée, ou active le micro et joue la note sur ton instrument.
        </p>
      </div>
    </div>
  )
}

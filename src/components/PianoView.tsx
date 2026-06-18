import type { Voice, Timbre } from '../types'
import { midiToFrenchName } from '../lib/pitch'
import { usePlayer } from '../state/PlayerContext'
import { variantFromTimbre } from '../types/music'
import KeyboardChrome from './Keyboard/KeyboardChrome'
import Keyboard from './Keyboard/Keyboard'

const ALL_VOICES: Voice[] = ['S', 'A', 'T', 'B']
const VOICE_LABEL: Record<Voice, string> = { S: 'Soprano', A: 'Alto', T: 'Ténor', B: 'Basse' }

const TIMBRE_LABEL: Record<Timbre, string> = {
  organ: 'Orgue', piano: 'Piano', strings: 'Cordes', brass: 'Cuivres',
  flute: 'Flûte', bell: 'Cloche', guitar: 'Guitare',
}
// Generic instrument glyph for the melodic variant header.
const MELODIC_ICON = 'M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z'

export default function PianoView() {
  const { litMidis, tonic, timbre, instrumentLoading } = usePlayer()
  const variant = variantFromTimbre(timbre)

  // Banner note names
  const leftNote   = litMidis['B'] != null ? midiToFrenchName(litMidis['B']!, tonic) : '—'
  const rightNotes = (['S', 'A', 'T'] as Voice[])
    .filter(v => litMidis[v] != null)
    .map(v => ({ v, name: midiToFrenchName(litMidis[v]!, tonic) }))

  return (
    <div style={{ flex: 'none', background: 'var(--bg2)', borderTop: '1px solid var(--border)' }}>
      {/* Hand banner */}
      <div style={{
        display: 'flex', gap: 18, alignItems: 'center',
        padding: '9px 16px', fontSize: 13,
        borderBottom: '1px solid var(--border)', flexWrap: 'wrap',
      }}>
        <div>
          <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 6 }}>Main Gauche</span>
          <span style={{
            padding: '3px 9px', borderRadius: 4, fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--mono)', background: 'var(--b-bg)', color: 'var(--b)',
            display: 'inline-block',
          }}>{leftNote}</span>
        </div>
        <div style={{ width: 1, height: 22, background: 'var(--border2)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 6 }}>Main Droite</span>
          {rightNotes.length > 0
            ? rightNotes.map(({ v, name }) => (
                <span key={v} style={{
                  padding: '3px 9px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--mono)', display: 'inline-block',
                  background: `var(--${v.toLowerCase()}-bg)`, color: `var(--${v.toLowerCase()})`,
                }}>{name}</span>
              ))
            : <span style={{
                padding: '3px 9px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--mono)', background: 'var(--s-bg)', color: 'var(--s)',
                display: 'inline-block',
              }}>—</span>
          }
        </div>
      </div>

      {/* Photoreal keybed */}
      <div style={{ overflowX: 'auto' }}>
        <KeyboardChrome
          variant={variant}
          label={TIMBRE_LABEL[timbre]}
          icon={variant === 'melodic' ? MELODIC_ICON : undefined}
        >
          <Keyboard variant={variant} litMidis={litMidis} tonic={tonic} disabled={instrumentLoading} />
        </KeyboardChrome>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 16, justifyContent: 'center',
        padding: '10px 16px 12px', flexWrap: 'wrap',
      }}>
        {ALL_VOICES.map(v => (
          <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text2)' }}>
            <span style={{
              width: 11, height: 11, borderRadius: 3, display: 'inline-block',
              background: `var(--${v.toLowerCase()})`,
            }} />
            {VOICE_LABEL[v]}
          </div>
        ))}
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
          Cliquer un temps (en pause) = apprentissage · glisser = boucle
        </span>
      </div>
    </div>
  )
}

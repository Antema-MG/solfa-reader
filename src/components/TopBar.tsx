import type { InstrumentId, KeyboardVariant } from '../types/music'
import { INSTRUMENTS } from '../types/music'
import { TONICS } from '../lib/pitch'
import { usePlayer } from '../state/PlayerContext'

const VARIANT_LABEL: Record<KeyboardVariant, string> = {
  organ: 'Orgues', piano: 'Pianos', melodic: 'Mélodiques',
}
const VARIANT_ORDER: KeyboardVariant[] = ['piano', 'organ', 'melodic']

export default function TopBar() {
  const player = usePlayer()
  const { score, status, isPlaying, tempo, tonic,
          instrumentId, instrumentLoading, setInstrument,
          play, pause, stop, setTempo, setTonic, openFile } = player

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then(openFile)
    e.target.value = ''
  }

  const meta = score?.metadata
  const measureNo = score
    ? Math.floor(player.currentBeat / score.beatsPerMeasure) + 1
    : null

  const ctrlStyle: React.CSSProperties = { display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text2)' }
  const selStyle:  React.CSSProperties = {
    background:'var(--bg4)', border:'1px solid var(--border2)',
    color:'var(--text)', borderRadius:6, padding:'6px 8px',
    fontSize:12, fontFamily:'inherit',
  }

  return (
    <div style={{
      flex:'none', background:'var(--bg2)',
      borderBottom:'1px solid var(--border)',
      padding:'10px 16px', display:'flex',
      gap:14, alignItems:'center', flexWrap:'wrap',
    }}>
      {/* File */}
      <button
        onClick={() => document.getElementById('msolfa-file-input')?.click()}
        style={{
          background:'var(--accent)', border:'1px solid var(--accent)',
          color:'#1a1a1a', padding:'7px 12px', borderRadius:6,
          fontSize:13, fontWeight:600,
        }}
      >Ouvrir .msolfa</button>
      <input id="msolfa-file-input" type="file" accept=".msolfa,.txt"
        style={{ display:'none' }} onChange={handleFile} />

      {/* Meta */}
      <div style={{ display:'flex', flexDirection:'column', lineHeight:1.3, minWidth:160 }}>
        <span style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>
          {meta?.title ?? '—'}
        </span>
        <span style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--mono)' }}>
          {meta
            ? `${meta.composer} · ${meta.numerator}/${meta.denominator} · M.${measureNo}/${score!.measures.length}`
            : 'Aucun fichier'}
        </span>
      </div>

      {/* Transport */}
      <div style={{ display:'flex', gap:6 }}>
        <button onClick={stop} title="Stop" style={{
          width:38, height:34, borderRadius:6,
          border:'1px solid var(--border2)',
          background:'var(--red-btn)', color:'#fff', fontSize:14,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>■</button>
        <button
          onClick={isPlaying ? pause : play}
          disabled={instrumentLoading}
          title={instrumentLoading ? 'Chargement de l’instrument…'
                 : isPlaying ? 'Pause' : status === 'paused' ? 'Reprendre' : 'Lecture'}
          style={{
            width:38, height:34, borderRadius:6,
            border:'1px solid var(--border2)',
            background: isPlaying ? 'var(--green2)' : 'var(--green)',
            color:'#fff', fontSize:14, cursor: instrumentLoading ? 'wait' : 'pointer',
            opacity: instrumentLoading ? 0.5 : 1,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}
        >{instrumentLoading ? '⋯' : isPlaying ? '⏸' : '▶'}</button>
      </div>

      {/* BPM */}
      <div style={ctrlStyle}>
        <span>BPM</span>
        <input type="range" min={20} max={240} value={tempo}
          onChange={e => setTempo(parseInt(e.target.value,10))}
          style={{ accentColor:'var(--accent)', width:120 }} />
        <span style={{ minWidth:30, fontWeight:600, color:'var(--text)', fontFamily:'var(--mono)' }}>
          {tempo}
        </span>
      </div>

      {/* Tonic */}
      <div style={ctrlStyle}>
        <span>Tonique</span>
        <select value={tonic} onChange={e => setTonic(e.target.value)} style={selStyle}>
          {TONICS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
      </div>

      {/* Instrument (sampled voices) */}
      <div style={ctrlStyle}>
        <span>Instrument</span>
        <select
          value={instrumentId}
          onChange={e => setInstrument(e.target.value as InstrumentId)}
          style={{ ...selStyle, maxWidth: 180 }}
        >
          {VARIANT_ORDER.map(variant => (
            <optgroup key={variant} label={VARIANT_LABEL[variant]}>
              {INSTRUMENTS.filter(i => i.variant === variant).map(i => (
                <option key={i.id} value={i.id}>{i.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <span style={{
          minWidth: 90, fontSize: 11, color: 'var(--accent)',
          opacity: instrumentLoading ? 1 : 0, transition: 'opacity .2s',
        }}>
          ⋯ chargement
        </span>
      </div>
    </div>
  )
}

import type { InstrumentId } from './types/music'

export type Voice   = 'S' | 'A' | 'T' | 'B'
export type Status  = 'stopped' | 'playing' | 'paused'
export type Timbre  = 'organ' | 'piano' | 'strings' | 'brass' | 'flute' | 'bell' | 'guitar'

// ── Parser types ────────────────────────────────────────────
export interface NoteElement { kind: 'note'; degree: string; chromatic: number; octave: string; dur: number }
export interface TieElement  { kind: 'tie';  dur: number }
export interface RestElement { kind: 'rest'; dur: number }
export type Element = NoteElement | TieElement | RestElement

export interface Beat    { elements: Element[]; raw: string }
export interface Measure { index: number; startBeat: number; beats: Record<Voice, Beat[]> }
export interface RenderBlock { comment: string | null; measures: Measure[] }

export interface Metadata {
  key: string; numerator: number; denominator: number
  title: string; composer: string; tempo: number
}

export interface NoteEvent {
  voice: Voice; degree: string; chromatic: number; octave: string
  start: number; durBeats: number; beatIndex: number
}

export interface Score {
  metadata: Metadata
  measures: Measure[]
  renderBlocks: RenderBlock[]
  events: NoteEvent[]
  totalBeats: number
  beatsPerMeasure: number
}

// ── Editor model ────────────────────────────────────────────
// A beat-grid abstraction: one EditCell per beat. Maps 1:1 onto the parser's
// per-beat Element list, but is shaped for direct editing + serialization.
export interface EditNote { kind: 'note'; degree: string; chromatic: number; octave: string }
export interface EditTie  { kind: 'tie' }
export interface EditRest { kind: 'rest' }
// Two-eighths beat: first slot may be note/tie/rest, second is always a note
// (mirrors the .msolfa grammar: `a.b`, `-.b`, `.b`).
export type EditSlot = EditNote | EditTie | EditRest
export interface EditPair { kind: 'pair'; a: EditSlot; b: EditNote }
export type EditCell = EditNote | EditTie | EditRest | EditPair

export interface EditMeasure { beats: Record<Voice, EditCell[]> }
export interface EditBlock   { comment: string | null; measures: EditMeasure[] }
export interface EditModel   { meta: Metadata; numerator: number; blocks: EditBlock[] }
export interface EditSelection { block: number; voice: Voice; measure: number; beat: number; slot: 'a' | 'b' | null }

export interface ParseError { line: number; message: string; voice?: string }
export type ParseResult =
  | { success: true;  file: Score }
  | { success: false; errors: ParseError[] }

// ── Player state ────────────────────────────────────────────
export interface MsolfaPlayerState {
  score:       Score | null
  error:       string | null
  status:      Status
  isPlaying:   boolean
  tempo:       number
  tonic:       string
  timbre:      Timbre
  instrumentId:      InstrumentId
  instrumentLoading: boolean
  muted:       Record<Voice, boolean>
  solo:        Set<Voice>
  currentBeat: number
  litMidis:    Partial<Record<Voice, number>>
  // actions
  openFile:      (text: string) => void
  play:          () => void
  pause:         () => void
  stop:          () => void
  seekTo:        (beat: number) => void
  setTempo:      (bpm: number)  => void
  setTonic:      (key: string)  => void
  setTimbre:     (t: Timbre)    => void
  setInstrument: (id: InstrumentId) => void
  toggleMute:    (v: Voice)     => void
  toggleSolo:    (v: Voice)     => void
  clearSelection: () => void
}

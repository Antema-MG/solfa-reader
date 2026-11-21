import type { InstrumentId } from './types/music'
import type { SungStyle } from './domain/choir'
import type { ChoirFx } from './services/choirSynth'
import type { Takes } from './services/recordedChoir'

export type Voice   = 'S' | 'A' | 'T' | 'B'
export type Status  = 'stopped' | 'playing' | 'paused'
export type Timbre  = 'organ' | 'piano' | 'strings' | 'brass' | 'flute' | 'bell' | 'guitar'

// ── Parser types ────────────────────────────────────────────
export interface NoteElement { kind: 'note'; degree: string; chromatic: number; octave: string; dur: number }
export interface TieElement  { kind: 'tie';  dur: number }
export interface RestElement { kind: 'rest'; dur: number }
export type Element = NoteElement | TieElement | RestElement

export interface Beat    { elements: Element[]; raw: string; lyric?: string }
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
// Subdivided beat: 2 (croches), 3 or 4 equal slots, each note/tie/rest
// (grammar: `a.b`, `-.b`, `.b`, `a.b.c`, `a.b.c.d`).
export type EditSlot = EditNote | EditTie | EditRest
/** `durs` (in beats, sums to 1) is set only for unequal splits: quarter-beat figures
 *  "a.(b.c)" = [0.5, 0.25, 0.25] and "(a.b).c" = [0.25, 0.25, 0.5]. Absent = equal slots. */
export interface EditTuple { kind: 'tuple'; slots: EditSlot[]; durs?: number[] }
export type EditCell = EditNote | EditTie | EditRest | EditTuple

export interface EditMeasure { beats: Record<Voice, EditCell[]> }
/** `lyrics` = the block's soprano syllables, space-separated ('' = none). */
export interface EditBlock   { comment: string | null; lyrics: string; measures: EditMeasure[] }
export interface EditModel   { meta: Metadata; numerator: number; blocks: EditBlock[] }
/** `slot` = index inside a tuple cell (null = whole cell). */
export interface EditSelection { block: number; voice: Voice; measure: number; beat: number; slot: number | null }

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
  /** Realistic sung choir replacing the instrument (null = instrument). */
  sung:        SungStyle | null
  muted:       Record<Voice, boolean>
  solo:        Set<Voice>
  currentBeat: number
  litMidis:    Partial<Record<Voice, number>>
  /** Loop on the phrase being played. */
  loop:        boolean
  // actions
  /** keepMix: live-edit reload that keeps mute/solo, tempo and tonic. */
  openFile:      (text: string, keepMix?: boolean) => void
  play:          () => void
  pause:         () => void
  stop:          () => void
  seekTo:        (beat: number) => void
  setTempo:      (bpm: number)  => void
  setTonic:      (key: string)  => void
  setTimbre:     (t: Timbre)    => void
  setInstrument: (id: InstrumentId) => void
  setVoiceInstrument: (v: Voice, id: InstrumentId | SungStyle | null) => void
  setSung:       (style: SungStyle) => void
  setChoirFx:    (fx: ChoirFx) => void
  setTakes:      (takes: Takes) => void
  toggleMute:    (v: Voice)     => void
  toggleSolo:    (v: Voice)     => void
  /** Exactly these voices sound; the others are muted (clears any solo). */
  setAudible:    (voices: Voice[]) => void
  clearSelection: () => void
  /** Loop the phrase under the playhead (on/off). */
  toggleLoop:    () => void
  /** Hear the key: the tonic (do) of the current tonality. */
  playKey:       () => void
  /** Hear the starting note of each voice (S A T B), then all together. */
  playClefs:     () => void
  /** Hear a single note (piano key tap). */
  playNote:      (midi: number) => void
}

export type Voice   = 'S' | 'A' | 'T' | 'B'
export type Status  = 'stopped' | 'playing' | 'paused'
export type Timbre  = 'organ' | 'piano' | 'strings' | 'brass'

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
  toggleMute:    (v: Voice)     => void
  toggleSolo:    (v: Voice)     => void
  clearSelection: () => void
}

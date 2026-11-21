import type { Timbre, Voice } from '../types'
import type { Player } from './soundfont'
import { midiToFreq } from '../domain/pitch'
import { ChoirSynth, type ChoirFx } from './choirSynth'
import type { Takes } from './recordedChoir'
import { syllableFor, type SungStyle } from '../domain/choir'

/** Per-note play options actually supported by soundfont-player (destination is
 *  honoured at runtime but missing from its typings). */
type SfPlay = (
  note: number | string,
  when?: number,
  opts?: { gain?: number; duration?: number; destination?: AudioNode },
) => unknown

type TimbreCfg = {
  type: OscillatorType
  a: number; d: number; s: number; r: number
  harmonics?: [number, number][]
  filter?: number
}

const TIMBRES: Record<Timbre, TimbreCfg> = {
  organ:   { type: 'sine',     a: 0.02,  d: 0.0,  s: 1.0,  r: 0.06,
             harmonics: [[1,.5],[2,.3],[3,.18],[4,.12],[5,.08]] },
  piano:   { type: 'triangle', a: 0.005, d: 0.7,  s: 0.0,  r: 0.12 },
  strings: { type: 'sawtooth', a: 0.18,  d: 0.1,  s: 0.85, r: 0.14, filter: 2200 },
  brass:   { type: 'square',   a: 0.03,  d: 0.08, s: 0.8,  r: 0.10, filter: 3000 },
  flute:   { type: 'sine',     a: 0.08,  d: 0.05, s: 0.85, r: 0.22,
             harmonics: [[1,1],[2,0.12],[3,0.04]], filter: 4000 },
  bell:    { type: 'sine',     a: 0.001, d: 1.6,  s: 0.0,  r: 0.9,
             harmonics: [[1,1],[2.75,0.4],[4.07,0.25],[5.51,0.12]] },
  guitar:  { type: 'triangle', a: 0.001, d: 0.35, s: 0.0,  r: 0.18,
             harmonics: [[1,1],[2,0.5],[3,0.25],[4,0.1]] },
}

export class AudioEngine {
  private ctx:       AudioContext | null = null
  private master:    GainNode    | null = null
  private vGain:     Record<string, GainNode> = {}
  private previewGain: GainNode  | null = null
  private samplerBus:  GainNode  | null = null
  private scheduled: OscillatorNode[] = []
  private sampler:   Player      | null = null
  /** Optional own instrument for one voice (e.g. "ma voix" as a choir). Falls back to `sampler`. */
  private voiceSamplers: Partial<Record<string, Player>> = {}
  /** Realistic sung choir (formant synthesis): main sound and/or one voice's own sound. */
  private choir: ChoirSynth | null = null
  private sung: SungStyle | null = null
  private voiceSung: Partial<Record<string, SungStyle>> = {}
  private choirFx: ChoirFx = { singers: 3, reverb: 45 }
  timbre: Timbre = 'organ'

  ensure() {
    if (this.ctx) return
    // 'playback' = bigger output buffer: far fewer crackles/dropouts on phones and
    // busy tabs; everything is scheduled ahead, so the extra latency is harmless.
    this.ctx   = new AudioContext({ latencyHint: 'playback' })
    this.keepAlive(this.ctx)
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.5
    this.master.connect(this.ctx.destination)
    for (const v of ['S','A','T','B']) {
      const g = this.ctx.createGain()
      g.gain.value = 1
      g.connect(this.master)
      this.vGain[v] = g
    }
    this.previewGain = this.ctx.createGain()
    this.previewGain.gain.value = 1
    this.previewGain.connect(this.master)
    // Sampled instruments share one bus → master (per-voice muting is handled
    // at schedule time, since a single sample-player can't gate per voice).
    this.samplerBus = this.ctx.createGain()
    this.samplerBus.gain.value = 1
    this.samplerBus.connect(this.master)
  }

  /**
   * The browser may suspend/interrupt the context on its own (iOS call or lock
   * screen, Android background, tab switch). While we want sound, resume it as
   * soon as the page is visible again or on the next touch (iOS needs a gesture).
   */
  private wantRunning = true
  private keepAlive(ctx: AudioContext) {
    const kick = () => { if (this.wantRunning && ctx.state !== 'running') void ctx.resume().catch(() => {}) }
    ctx.addEventListener('statechange', kick)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick() })
    for (const e of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(e, kick, { capture: true, passive: true })
  }

  /** Built on first sung use only (impulse response + noise cost CPU on phones). */
  private get choirSynth(): ChoirSynth | null {
    if (!this.choir && this.ctx) { this.choir = new ChoirSynth(this.ctx, this.master!); this.choir.setFx(this.choirFx); this.choir.setTakes(this.takes) }
    return this.choir
  }

  get currentTime() { return this.ctx?.currentTime ?? 0 }
  get audioContext(): AudioContext | null { return this.ctx }
  get samplerDestination(): AudioNode | null { return this.samplerBus }
  get hasSampler() { return !!this.sampler }
  /** Something can sound: a loaded sampler or the sung choir. */
  get ready() { return !!this.sampler || !!this.sung }

  /** Swap the active sampled instrument (null → fall back to the synth). */
  setSampler(p: Player | null) { this.sampler = p }
  setVoiceSampler(v: string, p: Player | null) { if (p) this.voiceSamplers[v] = p; else delete this.voiceSamplers[v] }
  /** Sung choir as the main sound (null → back to the sampler). */
  setSung(style: SungStyle | null) { this.sung = style }
  setVoiceSung(v: string, style: SungStyle | null) { if (style) this.voiceSung[v] = style; else delete this.voiceSung[v] }
  setChoirFx(fx: ChoirFx) { this.choirFx = fx; this.choir?.setFx(fx) }
  private takes: Takes = {}
  /** Real recorded syllables for the 'recorded' style. */
  setTakes(takes: Takes) { this.takes = takes; this.choir?.setTakes(takes) }

  resume()  { this.wantRunning = true;  void this.ctx?.resume() }
  suspend() { this.wantRunning = false; void this.ctx?.suspend() }

  applyVoiceGains(isAudible: (v: string) => boolean) {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    for (const v of ['S','A','T','B'])
      this.vGain[v]?.gain.setTargetAtTime(isAudible(v) ? 1 : 0, now, 0.005)
  }

  /**
   * Notes are built just in time (≈1.5 s ahead), never the whole score at once:
   * a long piece (Katsaho Aloha: 584 notes) scheduled up front means thousands of
   * audio nodes created in one go, which chokes the audio thread on phones and
   * leaves the app silent and frozen. Same queue idea as ChoirSynth.
   */
  private pending: { t: number; end: number; run: () => void }[] = []
  private pumpTimer = 0
  private queueNote(t: number, end: number, run: () => void) {
    this.pending.push({ t, end, run })
    if (!this.pumpTimer) this.pumpTimer = window.setInterval(this.pump, 100)
  }
  private pump = () => {
    if (!this.ctx) return
    const now = this.ctx.currentTime, lim = now + 1.5   // > 1 s: background tabs throttle timers to 1 s
    const due = this.pending.filter(p => p.t <= lim)
    if (due.length) this.pending = this.pending.filter(p => p.t > lim)
    due.forEach(p => { if (p.end > now + 0.02) p.run() })   // a late timer never replays stale notes
    if (!this.pending.length) { clearInterval(this.pumpTimer); this.pumpTimer = 0 }
  }

  stopAll() {
    this.pending = []
    clearInterval(this.pumpTimer); this.pumpTimer = 0
    this.scheduled.forEach(n => { try { n.stop() } catch (_) {} })
    this.scheduled = []
    try { this.sampler?.stop() } catch (_) {}
    Object.values(this.voiceSamplers).forEach(s => { try { s?.stop() } catch (_) {} })
    this.choir?.stopAll()
  }

  /** Schedule a voice note (sampled if a sampler is loaded, else synth). */
  scheduleNote(voice: string, midi: number, startTime: number, durSec: number, degree = 'd') {
    const sink = this.vGain[voice]
    if (!sink) return
    // Per-voice sound wins over the main one; a voice sampler overrides a main sung choir.
    const style = this.voiceSung[voice] ?? (this.voiceSamplers[voice] ? null : this.sung)
    const choir = style && this.choirSynth
    if (style && choir) {
      if (style === 'recorded' && choir.singRecorded(voice as Voice, midi, degree, startTime, durSec)) return
      choir.sing(voice as Voice, midiToFreq(midi), syllableFor(style, degree), startTime, durSec)
      return
    }
    const end = startTime + durSec
    this.queueNote(startTime, end, () => {
      const at = Math.max(startTime, this.currentTime)   // timer ran late: enter mid-note, keep the end
      this.emit(sink, midi, at, end - at, voice)
    })
    this.pump()   // notes due right away (the first beats) start without waiting for the timer
  }

  /**
   * "Clés": each voice sings its first note one after the other (S, A, T, B), then all
   * four together. Goes through scheduleNote, so every voice keeps its own sound.
   */
  playClefs(notes: { voice: string; midi: number; degree: string }[], gap = 0.8, chord = 1.6) {
    this.ensure(); this.resume()
    const t0 = this.currentTime + 0.05
    notes.forEach((n, i) => this.scheduleNote(n.voice, n.midi, t0 + i * gap, gap * 0.92, n.degree))
    const tc = t0 + notes.length * gap + 0.1
    notes.forEach(n => this.scheduleNote(n.voice, n.midi, tc, chord, n.degree))
  }

  /** Play a single note immediately, routed past the voice gains (key preview). */
  playPreview(midi: number, durSec = 0.7) {
    this.ensure(); this.resume()
    if (!this.previewGain) return
    this.emit(this.previewGain, midi, this.currentTime + 0.02, durSec)
  }

  private emit(dest: AudioNode, midi: number, startTime: number, durSec: number, voice?: string) {
    if (!this.ctx) return
    const sp = (voice && this.voiceSamplers[voice]) || this.sampler
    if (sp) {
      // The player is already wired to the sampler bus at load time; sample-player
      // ignores a per-note destination, so we don't pass `dest` here.
      (sp.play as unknown as SfPlay)(midi, startTime, { gain: 1, duration: durSec })
      return
    }
    const freq = midiToFreq(midi)
    const cfg  = TIMBRES[this.timbre]
    const env  = this.ctx.createGain()
    const sink = dest

    if (cfg.filter) {
      const filt = this.ctx.createBiquadFilter()
      filt.type = 'lowpass'
      filt.frequency.value = cfg.filter
      env.connect(filt)
      filt.connect(sink)
    } else {
      env.connect(sink)
    }

    const noteEnd  = startTime + durSec
    const sus      = cfg.s
    const g        = env.gain
    g.setValueAtTime(0.0001, startTime)
    g.linearRampToValueAtTime(1, startTime + cfg.a)
    const decayEnd = startTime + cfg.a + cfg.d
    g.linearRampToValueAtTime(Math.max(0.0001, sus), decayEnd)
    g.setValueAtTime(Math.max(0.0001, cfg.s > 0 ? sus : 0.0001), Math.max(decayEnd, noteEnd))
    g.linearRampToValueAtTime(0.0001, noteEnd + cfg.r)

    const parts = cfg.harmonics ?? ([[1, 1]] as [number, number][])
    parts.forEach(([mult, amp]) => {
      const osc = this.ctx!.createOscillator()
      osc.type = cfg.type
      osc.frequency.value = freq * mult
      if (cfg.harmonics) {
        const hg = this.ctx!.createGain()
        hg.gain.value = amp
        osc.connect(hg)
        hg.connect(env)
      } else {
        osc.connect(env)
      }
      osc.start(startTime)
      osc.stop(noteEnd + cfg.r + 0.05)
      this.scheduled.push(osc)
      osc.onended = () => { this.scheduled = this.scheduled.filter(n => n !== osc) }   // don't grow forever over a long piece
    })
  }
}

import type { Timbre } from '../types'
import type { Player } from './soundfont'
import { midiToFreq } from './pitch'

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
  timbre: Timbre = 'organ'

  ensure() {
    if (this.ctx) return
    this.ctx   = new AudioContext()
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

  get currentTime() { return this.ctx?.currentTime ?? 0 }
  get audioContext(): AudioContext | null { return this.ctx }
  get samplerDestination(): AudioNode | null { return this.samplerBus }
  get hasSampler() { return !!this.sampler }

  /** Swap the active sampled instrument (null → fall back to the synth). */
  setSampler(p: Player | null) { this.sampler = p }

  resume()  { void this.ctx?.resume() }
  suspend() { void this.ctx?.suspend() }

  applyVoiceGains(isAudible: (v: string) => boolean) {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    for (const v of ['S','A','T','B'])
      this.vGain[v]?.gain.setTargetAtTime(isAudible(v) ? 1 : 0, now, 0.005)
  }

  stopAll() {
    this.scheduled.forEach(n => { try { n.stop() } catch (_) {} })
    this.scheduled = []
    try { this.sampler?.stop() } catch (_) {}
  }

  /** Schedule a voice note (sampled if a sampler is loaded, else synth). */
  scheduleNote(voice: string, midi: number, startTime: number, durSec: number) {
    const sink = this.vGain[voice]
    if (!sink) return
    this.emit(sink, midi, startTime, durSec)
  }

  /** Play a single note immediately, routed past the voice gains (key preview). */
  playPreview(midi: number, durSec = 0.7) {
    this.ensure(); this.resume()
    if (!this.previewGain) return
    this.emit(this.previewGain, midi, this.currentTime + 0.02, durSec)
  }

  private emit(dest: AudioNode, midi: number, startTime: number, durSec: number) {
    if (!this.ctx) return
    if (this.sampler) {
      // The player is already wired to the sampler bus at load time; sample-player
      // ignores a per-note destination, so we don't pass `dest` here.
      (this.sampler.play as unknown as SfPlay)(midi, startTime, { gain: 1, duration: durSec })
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
    })
  }
}

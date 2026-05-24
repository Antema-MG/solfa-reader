import type { Timbre } from '../types'

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
}

export class AudioEngine {
  private ctx:       AudioContext | null = null
  private master:    GainNode    | null = null
  private vGain:     Record<string, GainNode> = {}
  private scheduled: OscillatorNode[] = []
  timbre: Timbre = 'organ'

  ensure() {
    if (this.ctx) return
    this.ctx   = new AudioContext()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.22
    this.master.connect(this.ctx.destination)
    for (const v of ['S','A','T','B']) {
      const g = this.ctx.createGain()
      g.gain.value = 1
      g.connect(this.master)
      this.vGain[v] = g
    }
  }

  get currentTime() { return this.ctx?.currentTime ?? 0 }

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
  }

  scheduleNote(voice: string, freq: number, startTime: number, durSec: number) {
    if (!this.ctx) return
    const cfg  = TIMBRES[this.timbre]
    const env  = this.ctx.createGain()
    const sink = this.vGain[voice]
    if (!sink) return

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
